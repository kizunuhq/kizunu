import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'kizunu:is_public'

export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true)
