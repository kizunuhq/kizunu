import { Module } from '@nestjs/common'

import { DirectoryCacheService } from './directory-cache.service'

@Module({
  providers: [DirectoryCacheService],
  exports: [DirectoryCacheService],
})
export class DirectoryModule {}
