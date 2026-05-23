export function OAuthSeparator() {
  return (
    <div className="relative my-2 flex items-center">
      <div className="border-border flex-1 border-t border-dashed" />
      <span className="text-muted-foreground bg-background mx-3 font-mono text-[10px] tracking-wide uppercase">
        [or continue with]
      </span>
      <div className="border-border flex-1 border-t border-dashed" />
    </div>
  )
}
