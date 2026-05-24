import { KMark } from '@kizunu/web/routes/-marketing/kizunu-mark'

export function AuthBrandingPanel() {
  return (
    <aside className="border-border bg-background relative hidden flex-col justify-between border-r border-dashed p-8 md:flex md:p-12">
      <div className="flex items-center gap-2">
        <KMark className="size-8" />
        <span className="text-foreground font-mono text-sm font-medium tracking-tight">kizunu</span>
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-kizunu-green font-mono text-xs font-medium">
          [self-hostable sales engagement]
        </p>
        <p className="text-foreground max-w-md text-2xl leading-tight font-medium text-balance">
          A control panel for multi-channel cadences that respect reply-stop in milliseconds.
        </p>
        <p className="text-muted-foreground font-mono text-xs">open source · v0.1</p>
      </div>
    </aside>
  )
}
