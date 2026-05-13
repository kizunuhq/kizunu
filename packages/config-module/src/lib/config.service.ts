import { Injectable } from '@nestjs/common'
import { ConfigService as NestConfigService, type Path, type PathValue } from '@nestjs/config'

/**
 * Wraps NestConfigService with `WasValidated = true` (second generic), so
 * `get(path)` always returns `T` instead of `T | undefined`. Pair with a Zod
 * schema in the `load` factory to guarantee validation happens at boot.
 */
@Injectable()
export class ConfigService<Config> extends NestConfigService<Config, true> {
  override get<P extends Path<Config>>(propertyPath: P): PathValue<Config, P> {
    return super.get(propertyPath, { infer: true })
  }
}
