import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'

import { Clock } from '../clock'
import { JourneyDispatcher } from '../services/journey-dispatcher'

const POLL_INTERVAL_MS = 15_000

/**
 * In-process poller (decision D5 — no Redis/BullMQ). Ticks on an interval and asks the
 * dispatcher to handle due journeys; restart resilience comes from `nextTouchAt` in the
 * database, not a queue. Disabled under `NODE_ENV=test` (tests drive `dispatchDue`
 * directly).
 */
@Injectable()
export class JourneyPoller implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JourneyPoller.name)
  private timer?: ReturnType<typeof setInterval>

  constructor(
    private readonly dispatcher: JourneyDispatcher,
    private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    if (process.env['NODE_ENV'] === 'test') return
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  private async tick(): Promise<void> {
    try {
      await this.dispatcher.dispatchDue(this.clock.now())
    } catch (error) {
      this.logger.error('Journey poll failed', error)
    }
  }
}
