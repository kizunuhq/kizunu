// Source: chatwoot/chatwoot @ c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc
// File:   app/javascript/dashboard/routes/dashboard/settings/inbox/channels/whatsapp/utils.js
// Link:   https://github.com/chatwoot/chatwoot/blob/c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc/app/javascript/dashboard/routes/dashboard/settings/inbox/channels/whatsapp/utils.js
// License: MIT
// Fetched: 2026-05-22
//
// The FB.login configuration for WhatsApp Embedded Signup with COEXISTENCE mode.
// The distinguishing field is `extras.featureType = 'whatsapp_business_app_onboarding'`.
// For standard Cloud API onboarding (non-Coex), the featureType is different
// (Meta's docs name it `whatsapp_business`); confirm against Meta's current docs
// before implementing the non-Coex branch.

// --- SDK init (default Graph API version v22.0) ---

FB.init({
  appId: WHATSAPP_APP_ID,
  autoLogAppEvents: true,
  xfbml: true,
  version: 'v22.0',
})

// --- Login flow ---

window.FB.login(fbLoginCallback, {
  config_id: WHATSAPP_CONFIGURATION_ID, // Meta App -> Facebook Login for Business -> Configurations
  response_type: 'code',
  override_default_response_type: true,
  extras: {
    setup: {},
    featureType: 'whatsapp_business_app_onboarding', // Coex switch (camelCase, not snake_case)
    sessionInfoVersion: '3', // current callback data shape
  },
})

// --- Callback message-event handling ---
//
// The popup posts back via window.postMessage from a *.facebook.com origin.
// Validate event.origin endsWith('facebook.com') before trusting data.
//
// Parsed data shape:
//   { type: 'WA_EMBEDDED_SIGNUP', event: <see below>, data: { business_id, waba_id, phone_number_id }, ... }
//
// Completion events (distinguish Coex vs Cloud API at the callback):
//   FINISH                                  - standard Cloud API onboarding succeeded
//   FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING - Coex onboarding succeeded (number stays on WA Business app)
//   CANCEL                                  - user dismissed the popup
//   error                                   - flow failed (data carries error_message, error_id, session_id)
