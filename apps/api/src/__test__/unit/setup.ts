import { installBunPolyfill } from '@kizunu/api/__test__/bun-polyfill'

process.env['APP_CREDENTIALS_ENCRYPTION_KEY'] ??= 'htYxDTrLXwIJ1iCWH6q6je/JXJlVkqLL64Fd9EOml+4='

installBunPolyfill()
