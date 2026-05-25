import { ResendEmailButton } from '@kizunu/web/components/composed/resend-email-button'

export function EmailRowAction({ isVerified }: { isVerified: boolean }) {
  if (isVerified) {
    return (
      <span className="text-kizunu-green inline-flex items-center gap-1 font-mono text-xs">
        <span className="bg-kizunu-green inline-block size-1.5 rounded-full" />
        Verified
      </span>
    )
  }
  return <ResendEmailButton />
}
