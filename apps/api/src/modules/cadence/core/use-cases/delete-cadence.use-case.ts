import { Injectable } from '@nestjs/common'

import { CadenceRepository } from '../../persistence/cadence.repository'
import { CadenceNotFoundException } from '../errors/cadence.errors'

@Injectable()
export class DeleteCadenceUseCase {
  constructor(private readonly cadences: CadenceRepository) {}

  async execute(cadenceId: string, workspaceId: string): Promise<void> {
    const existing = await this.cadences.findByIdInWorkspace(cadenceId, workspaceId)
    if (!existing) throw new CadenceNotFoundException(cadenceId)
    await this.cadences.delete(cadenceId)
  }
}
