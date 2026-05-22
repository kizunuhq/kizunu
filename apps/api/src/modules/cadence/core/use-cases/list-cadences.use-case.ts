import { Injectable } from '@nestjs/common'

import { type CadenceSummary, CadenceRepository } from '../../persistence/cadence.repository'

@Injectable()
export class ListCadencesUseCase {
  constructor(private readonly cadences: CadenceRepository) {}

  async execute(workspaceId: string): Promise<CadenceSummary[]> {
    return await this.cadences.listByWorkspace(workspaceId)
  }
}
