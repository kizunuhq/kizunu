interface KbdProps {
  children: string
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className="border-border bg-background-200 text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-[2px] border px-1 font-mono text-[10px] leading-none"
    >
      {children}
    </kbd>
  )
}
