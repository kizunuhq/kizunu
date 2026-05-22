import { API_URL } from '@kizunu/api-client/client/api-client'
import { useAuthCapabilities } from '@kizunu/api-client/identity/use-auth-capabilities'
import { Routes } from '@kizunu/api-contracts/routes'
import { buttonVariants } from '@kizunu/web/components/primitives/button'

export function OAuthButtons() {
  const capabilities = useAuthCapabilities()
  const providers = capabilities.data?.oauthProviders ?? []

  if (providers.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <a
          key={provider.id}
          href={`${API_URL}${Routes.auth.oauthBegin(provider.id)}`}
          className={buttonVariants({ variant: 'outline' })}
        >
          Sign in with {provider.label}
        </a>
      ))}
    </div>
  )
}
