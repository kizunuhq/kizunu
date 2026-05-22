/**
 * Static description of an OAuth provider. `id` is the URL segment
 * (`/auth/oauth/:id`); `label` is what the login button shows.
 */
export interface OAuthProviderManifest {
  id: string
  label: string
}
