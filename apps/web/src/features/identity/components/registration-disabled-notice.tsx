import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kizunu/web/components/primitives/card'

export function RegistrationDisabledNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration disabled</CardTitle>
        <CardDescription>Public sign-up is turned off for this instance.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Ask an administrator for an invitation, or sign in if you already have an account.
        </p>
      </CardContent>
    </Card>
  )
}
