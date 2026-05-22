/**
 * The normalized identity a provider returns after a code exchange. `emailVerified`
 * gates account linking — an unverified email never links or creates an account.
 */
export interface OAuthProfile {
  providerAccountId: string
  email: string
  emailVerified: boolean
  name: string
}
