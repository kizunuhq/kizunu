import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { ListAvailableConnectorsUseCase } from '../../core/use-cases/list-available-connectors.use-case'

@ApiTags('crm')
@Controller()
export class ConnectorController {
  constructor(private readonly listConnectors: ListAvailableConnectorsUseCase) {}

  @Get('connectors')
  list() {
    return { connectors: this.listConnectors.execute() }
  }
}
