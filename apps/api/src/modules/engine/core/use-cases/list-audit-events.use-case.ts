import { Injectable } from '@nestjs/common'

import {
  type AuditEventSummary,
  AuditEventRepository,
} from '../../persistence/audit-event.repository'

@Injectable()
export class ListAuditEventsUseCase {
  constructor(private readonly events: AuditEventRepository) {}

  async execute(workspaceId: string): Promise<AuditEventSummary[]> {
    return await this.events.listByWorkspace(workspaceId)
  }
}
