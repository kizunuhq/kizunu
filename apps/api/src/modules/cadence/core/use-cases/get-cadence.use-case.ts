import { Injectable } from '@nestjs/common'

import { type CadenceWithSteps, CadenceRepository } from '../../persistence/cadence.repository'
import { CadenceNotFoundException } from '../errors/cadence.errors'

@Injectable()
export class GetCadenceUseCase {
  constructor(private readonly cadences: CadenceRepository) {}

  async execute(cadenceId: string, workspaceId: string): Promise<CadenceWithSteps> {
    const cadence = await this.cadences.getWithSteps(cadenceId, workspaceId)
    if (!cadence) throw new CadenceNotFoundException(cadenceId)
    return cadence
  }
}
