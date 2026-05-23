import { installBunPolyfill } from '@kizunu/api/__test__/bun-polyfill'

process.env['NODE_ENV'] ??= 'test'
process.env['APP_DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/kizunu_test'
process.env['APP_CREDENTIALS_ENCRYPTION_KEY'] ??= 'htYxDTrLXwIJ1iCWH6q6je/JXJlVkqLL64Fd9EOml+4='
process.env['META_APP_ID'] ??= 'fixture-app'
process.env['META_APP_SECRET'] ??= 'fixture-secret'
process.env['META_COEX_CONFIG_ID'] ??= 'fixture-config'

installBunPolyfill()
