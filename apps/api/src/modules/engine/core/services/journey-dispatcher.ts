import type { CadenceAction } from '@kizunu/api-contracts/cadence'
import {
  isWithinWindow,
  slideToWindow,
} from '@kizunu/api/modules/cadence/core/domain/sending-window-slide'
import type {
  CadenceWithSteps,
  CadenceStepRow,
} from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { TemplateRepository } from '@kizunu/api/modules/cadence/persistence/template.repository'
import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import type { SendPayload } from '@kizunu/api/modules/channel/core/plugin/send-payload'
import { ChannelAccessRepository } from '@kizunu/api/modules/channel/persistence/channel-access.repository'
import { ChannelAccountRepository } from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable, Logger } from '@nestjs/common'

import {
  type LockedJourney,
  LeadJourneyRepository,
} from '../../persistence/lead-journey.repository'
import { TouchAttemptRepository } from '../../persistence/touch-attempt.repository'
import type { DbTransaction } from '../../persistence/transaction'
import { Clock } from '../clock'
import { Jitter } from '../domain/jitter'
import { JourneyEvent } from '../domain/journey-event'
import { LeadJourneyErrorReason } from '../domain/lead-journey-error-reason'
import { LeadJourneyStatus } from '../domain/lead-journey-status'
import { transition } from '../domain/lead-journey-transition'
import { resolveNextStep } from '../domain/next-step'
import {
  TemplateVariableUnknownException,
  TemplateVariableUnresolvedException,
} from '../errors/template-variable.errors'
import { CadenceActionExecutor } from './cadence-action-executor'
import { TemplateVariableResolver } from './template-variable-resolver'

const BATCH_SIZE = 50
const MS_PER_MINUTE = 60 * 1000

/**
 * The engine's dispatcher (decisions D1/D5). For each due running journey it takes a
 * pessimistic row lock, sends the next step's touch through the lead-owner's primary
 * channel, logs a CRM activity, and advances `nextTouchAt`; on exhaustion it runs the
 * cadence's `onExhausted` actions. The `TouchAttempt` insert inside the same
 * transaction makes each step idempotent under retry/race.
 */
@Injectable()
export class JourneyDispatcher {
  private readonly logger = new Logger(JourneyDispatcher.name)

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly journeys: LeadJourneyRepository,
    private readonly touchAttempts: TouchAttemptRepository,
    private readonly cadences: CadenceRepository,
    private readonly templates: TemplateRepository,
    private readonly channelAccess: ChannelAccessRepository,
    private readonly channelAccounts: ChannelAccountRepository,
    private readonly channelRegistry: ChannelPluginRegistry,
    private readonly connectors: ConnectorAccountRepository,
    private readonly crmRegistry: CrmConnectorRegistry,
    private readonly executor: CadenceActionExecutor,
    private readonly variableResolver: TemplateVariableResolver,
    private readonly jitter: Jitter,
    private readonly clock: Clock,
  ) {}

  async dispatchDue(now: Date = this.clock.now()): Promise<void> {
    const ids = await this.journeys.findDueIds(now, BATCH_SIZE)
    for (const id of ids) {
      try {
        await this.drizzle.db.transaction((tx) => this.dispatchOne(tx, id, now))
      } catch (error) {
        this.logger.error(`Failed to dispatch journey ${id}`, error)
      }
    }
  }

  private async dispatchOne(tx: DbTransaction, id: string, now: Date): Promise<void> {
    const journey = await this.journeys.lockById(tx, id)
    if (!journey || journey.status !== LeadJourneyStatus.Running) return
    if (!journey.nextTouchAt || journey.nextTouchAt > now) return

    const cadence = await this.cadences.getWithSteps(journey.cadenceId, journey.workspaceId)
    if (!cadence) return

    const next = resolveNextStep(journey.currentStepOrder, cadence.steps.length)
    if (next.kind === 'exhausted') {
      await this.exhaust(tx, journey, cadence.onExhausted)
      return
    }
    if (cadence.sendingWindow && !isWithinWindow(cadence.sendingWindow, now)) {
      const nextValid = slideToWindow(cadence.sendingWindow, now)
      await this.journeys.advance(tx, journey.id, journey.currentStepOrder, nextValid)
      return
    }
    await this.dispatchStep(tx, journey, cadence, next.stepOrder, now)
  }

  private async exhaust(
    tx: DbTransaction,
    journey: LockedJourney,
    onExhausted: CadenceAction[],
  ): Promise<void> {
    await this.journeys.setStatus(
      tx,
      journey.id,
      transition(LeadJourneyStatus.Running, JourneyEvent.Exhaust),
    )
    await this.runActions(journey, onExhausted)
  }

  private async dispatchStep(
    tx: DbTransaction,
    journey: LockedJourney,
    cadence: CadenceWithSteps,
    stepOrder: number,
    now: Date,
  ): Promise<void> {
    const step = cadence.steps[stepOrder]
    if (!step) return
    const channelAccountId = await this.resolveChannel(
      journey.leadOwnerUserId,
      step.channelPluginId,
    )
    if (!channelAccountId)
      return await this.errorOut(tx, journey.id, LeadJourneyErrorReason.NoChannel)

    const attempt = await this.touchAttempts.tryInsert(tx, journey.id, stepOrder)
    if (!attempt) return

    const plugin = this.channelRegistry.get(step.channelPluginId)
    const decision = plugin.validate({
      now,
      capabilities: plugin.manifest.capabilities,
      hasApprovedTemplate: !!step.templateId,
      lastInboundAt: undefined,
    })
    if (decision.action === 'error' || (decision.action === 'send' && !step.templateId)) {
      await this.touchAttempts.recordResult(tx, attempt.id, {
        status: 'failed',
        error: decision.reason ?? 'template_required',
      })
      return await this.errorOut(tx, journey.id, LeadJourneyErrorReason.TemplateRequired)
    }

    if (decision.action === 'skip') {
      await this.touchAttempts.recordResult(tx, attempt.id, { status: 'skipped' })
      await this.scheduleNext(tx, journey.id, cadence.steps, stepOrder, now)
      return
    }
    const template = step.templateId
      ? await this.templates.findByIdInWorkspace(step.templateId, journey.workspaceId)
      : undefined
    const variables = this.tryResolveVariables(journey, template?.variables)
    if (variables.kind === 'failed') {
      await this.touchAttempts.recordResult(tx, attempt.id, {
        status: 'failed',
        error: `${variables.reason}:${variables.variableName}`,
      })
      return await this.errorOut(tx, journey.id, variables.reason)
    }
    await this.sendStep(
      tx,
      journey,
      step,
      stepOrder,
      attempt.id,
      channelAccountId,
      template,
      variables.value,
    )
    await this.scheduleNext(tx, journey.id, cadence.steps, stepOrder, now)
  }

  private tryResolveVariables(
    journey: LockedJourney,
    variables: readonly string[] | undefined,
  ):
    | { kind: 'value'; value: Record<string, string> | undefined }
    | { kind: 'failed'; reason: string; variableName: string } {
    if (!variables || variables.length === 0) return { kind: 'value', value: undefined }
    try {
      const resolved = this.variableResolver.resolve(variables, {
        lead: {
          name: journey.leadName,
          phone: journey.leadPhone,
          ownerExternalId: journey.leadOwnerExternalId,
        },
      })
      return { kind: 'value', value: resolved }
    } catch (error) {
      if (error instanceof TemplateVariableUnknownException) {
        return {
          kind: 'failed',
          reason: LeadJourneyErrorReason.TemplateVariableUnknown,
          variableName: error.variableName,
        }
      }
      if (error instanceof TemplateVariableUnresolvedException) {
        return {
          kind: 'failed',
          reason: LeadJourneyErrorReason.TemplateVariableMissing,
          variableName: error.variableName,
        }
      }
      throw error
    }
  }

  private async sendStep(
    tx: DbTransaction,
    journey: LockedJourney,
    step: CadenceStepRow,
    stepOrder: number,
    attemptId: string,
    channelAccountId: string,
    template:
      | { providerTemplateName: string; language: string; variables: readonly string[] }
      | undefined,
    variables: Record<string, string> | undefined,
  ): Promise<void> {
    const channel = await this.channelAccounts.findCredentials(channelAccountId)
    const plugin = this.channelRegistry.get(step.channelPluginId)
    const payload: SendPayload = {
      to: journey.leadPhone ?? '',
      mode: 'template',
      template: template
        ? { name: template.providerTemplateName, language: template.language, variables }
        : undefined,
    }
    const result = await plugin.send(payload, channel?.credentials)
    const externalActivityId = await this.logTouch(journey, stepOrder)
    await this.touchAttempts.recordResult(tx, attemptId, {
      status: result.status === 'sent' ? 'sent' : 'failed',
      externalMessageId: result.externalMessageId,
      externalActivityId,
      error: result.error,
    })
  }

  private async logTouch(journey: LockedJourney, stepOrder: number): Promise<string | undefined> {
    const account = await this.connectors.findById(journey.connectorAccountId)
    if (!account) return undefined
    const { externalActivityId } = await this.crmRegistry.get(account.connectorId).logActivity(
      journey.leadExternalId,
      {
        type: 'task',
        subject: `Cadence touch ${stepOrder + 1}`,
        ownerExternalId: journey.leadOwnerExternalId,
      },
      account.credentials,
    )
    return externalActivityId
  }

  private async runActions(journey: LockedJourney, actions: CadenceAction[]): Promise<void> {
    if (actions.length === 0) return
    const account = await this.connectors.findById(journey.connectorAccountId)
    if (!account) return
    await this.executor.execute(actions, {
      connector: this.crmRegistry.get(account.connectorId),
      credentials: account.credentials,
      externalId: journey.leadExternalId,
    })
  }

  private async resolveChannel(
    ownerUserId: string | null,
    pluginId: string,
  ): Promise<string | undefined> {
    if (!ownerUserId) return undefined
    const access = await this.channelAccess.findPrimaryAccount(ownerUserId, pluginId)
    return access?.channelAccountId
  }

  private async scheduleNext(
    tx: DbTransaction,
    journeyId: string,
    steps: CadenceStepRow[],
    stepOrder: number,
    now: Date,
  ): Promise<void> {
    const following = steps[stepOrder + 1]
    const step = steps[stepOrder]!
    const delayMinutes = following ? following.delayMinutes : step.delayMinutes
    const minutes = this.jitter.apply(delayMinutes, step.jitterMinutes)
    const nextTouchAt = new Date(now.getTime() + minutes * MS_PER_MINUTE)
    await this.journeys.advance(tx, journeyId, stepOrder, nextTouchAt)
  }

  private async errorOut(tx: DbTransaction, id: string, reason: string): Promise<void> {
    await this.journeys.setStatus(tx, id, LeadJourneyStatus.ErrorState, reason)
  }
}
