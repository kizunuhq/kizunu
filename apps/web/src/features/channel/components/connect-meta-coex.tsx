import { useConnectMetaCoex } from '@kizunu/api-client/channel/use-connect-meta-coex'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useEffect, useState } from 'react'

const FB_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js'
const FB_VERSION = 'v22.0'

interface CoexCallbackData {
  type?: string
  event?: string
  data?: {
    business_id?: string
    waba_id?: string
    phone_number_id?: string
  }
  error_message?: string
}

interface FacebookSdk {
  init: (options: {
    appId: string
    autoLogAppEvents: boolean
    xfbml: boolean
    version: string
  }) => void
  login: (
    callback: (response: { authResponse?: { code?: string } }) => void,
    params: FBLoginParams,
  ) => void
}

interface FBLoginParams {
  config_id: string
  response_type: 'code'
  override_default_response_type: true
  extras: {
    setup: Record<string, never>
    featureType: 'whatsapp_business_app_onboarding'
    sessionInfoVersion: '3'
  }
}

declare global {
  interface Window {
    FB?: FacebookSdk
    fbAsyncInit?: () => void
  }
}

/**
 * Embedded Signup (feature 031). Loads the FB JS SDK on mount, listens for the
 * Coex completion postMessage from `*.facebook.com`, and posts the auth code
 * to the new connect endpoint. The page reads `appId` + `coexConfigId` via
 * props because no public capability endpoint exists yet — the parent screen
 * supplies them from the operator-facing settings (or from env-injected
 * build-time defaults).
 *
 * UX: a "Connect WhatsApp Business" button kicks off `FB.login`; the inline
 * status area shows progress / errors. On success, the create mutation runs
 * and the parent screen receives `onSuccess`.
 */
interface ConnectMetaCoexProps {
  workspaceId: string
  appId: string
  coexConfigId: string
  onSuccess?: () => void
}

export function ConnectMetaCoex({
  workspaceId,
  appId,
  coexConfigId,
  onSuccess,
}: ConnectMetaCoexProps) {
  const [name, setName] = useState('WhatsApp Coex')
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [code, setCode] = useState<string | undefined>(undefined)
  const [businessId, setBusinessId] = useState<string | undefined>(undefined)
  const [wabaId, setWabaId] = useState<string | undefined>(undefined)
  const [phoneNumberId, setPhoneNumberId] = useState<string | undefined>(undefined)

  const mutation = useConnectMetaCoex(workspaceId, {
    onSuccess: () => {
      setStatus('Channel connected.')
      onSuccess?.()
    },
    onError: (error) => setStatus(`Connect failed: ${error.message}`),
  })

  useEffect(() => {
    loadFacebookSdk(appId)
  }, [appId])

  useEffect(() => {
    function handle(event: MessageEvent<unknown>) {
      if (!event.origin.endsWith('facebook.com')) return
      const payload = parsePayload(event.data)
      if (!payload || payload.type !== 'WA_EMBEDDED_SIGNUP') return
      if (payload.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' && payload.data) {
        setBusinessId(payload.data.business_id)
        setWabaId(payload.data.waba_id)
        setPhoneNumberId(payload.data.phone_number_id)
        setStatus('Embedded Signup complete — submit to finish the connect.')
      } else if (payload.event === 'CANCEL') {
        setStatus('Signup cancelled.')
      } else if (payload.error_message) {
        setStatus(`Signup error: ${payload.error_message}`)
      }
    }
    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [])

  function startLogin() {
    if (!window.FB) {
      setStatus('Facebook SDK not loaded yet.')
      return
    }
    window.FB.login(
      (response) => {
        if (response.authResponse?.code) {
          setCode(response.authResponse.code)
          setStatus('Auth code received.')
        }
      },
      {
        config_id: coexConfigId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      },
    )
  }

  function submit() {
    if (!code || !businessId || !wabaId || !phoneNumberId) {
      setStatus('Finish the Embedded Signup flow before submitting.')
      return
    }
    mutation.mutate({ code, businessId, wabaId, phoneNumberId, name })
  }

  const ready = Boolean(code && businessId && wabaId && phoneNumberId)

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="coex-name">Channel name</FieldLabel>
        <Input id="coex-name" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Button type="button" onClick={startLogin}>
        Connect WhatsApp Business
      </Button>
      <Button type="button" disabled={!ready || mutation.isPending} onClick={submit}>
        Finish connect
      </Button>
      {status ? <p className="text-muted-foreground text-sm">{status}</p> : null}
    </div>
  )
}

function loadFacebookSdk(appId: string) {
  if (typeof window === 'undefined') return
  if (window.FB) return
  if (document.getElementById('facebook-jssdk')) return
  window.fbAsyncInit = () => {
    window.FB?.init({ appId, autoLogAppEvents: true, xfbml: true, version: FB_VERSION })
  }
  const script = document.createElement('script')
  script.id = 'facebook-jssdk'
  script.src = FB_SDK_SRC
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

function parsePayload(raw: unknown): CoexCallbackData | undefined {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? (parsed as CoexCallbackData) : undefined
    } catch {
      return undefined
    }
  }
  if (raw && typeof raw === 'object') return raw as CoexCallbackData
  return undefined
}
