import type { MetaCredentials } from '@kizunu/api-contracts/channel'
import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import type { DirectoryInput } from '@kizunu/api/modules/_shared/directory/directory-input'
import { ConnectorDirectoryUnsupportedException } from '@kizunu/api/modules/_shared/directory/directory.errors'

import { listMetaPhoneNumbers, listMetaTemplates } from './meta-directory'
import type { FetchFn } from './meta-send'

interface DispatchOptions {
  baseUrl: string
  fetchFn: FetchFn
  connectorId: string
}

export async function dispatchMetaDirectory<C extends MetaCredentials>(
  input: DirectoryInput<C>,
  options: DispatchOptions,
): Promise<DirectoryResult> {
  const ctx = {
    fetchFn: options.fetchFn,
    baseUrl: options.baseUrl,
    accountId: input.accountId,
    credentials: input.credentials,
  }
  if (input.resource === 'templates') return listMetaTemplates(ctx)
  if (input.resource === 'phoneNumbers') return listMetaPhoneNumbers(ctx)
  throw new ConnectorDirectoryUnsupportedException({
    connectorId: options.connectorId,
    resource: input.resource,
  })
}
