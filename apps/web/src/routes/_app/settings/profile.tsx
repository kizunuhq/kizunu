import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/profile')({
  component: SettingsProfilePage,
})

function SettingsProfilePage() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Profile</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        The profile settings page will land with the settings hub.
      </p>
    </div>
  )
}
