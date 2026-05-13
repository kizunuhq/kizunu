import { createFileRoute } from '@tanstack/react-router'

import { KizunuLandingPage } from '../features/marketing/components/kizunu-landing-page'

export const Route = createFileRoute('/')({
  component: LandingPageRoute,
})

function LandingPageRoute() {
  return <KizunuLandingPage />
}
