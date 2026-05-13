import { Injectable } from '@nestjs/common'
import { SessionRepository } from '../../persistence/session.repository'

@Injectable()
export class LogoutUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(sessionId: string): Promise<void> {
    await this.sessions.revoke(sessionId)
  }
}
