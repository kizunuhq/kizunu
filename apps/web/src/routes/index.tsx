import { KizunuLandingPage } from '@kizunu/web/routes/-marketing/kizunu-landing-page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPageRoute,
})

function LandingPageRoute() {
  return <KizunuLandingPage />
}
