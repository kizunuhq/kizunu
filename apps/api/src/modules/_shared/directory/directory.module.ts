import { Module } from '@nestjs/common'

import { DirectoryCacheService } from './directory-cache.service'
import { DirectoryQueryService } from './directory-query.service'

@Module({
  providers: [DirectoryCacheService, DirectoryQueryService],
  exports: [DirectoryQueryService],
})
export class DirectoryModule {}
