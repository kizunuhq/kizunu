import type { CSSProperties } from 'react'

export type MarkVariant = 'full' | 'scanned'

interface KMarkProps {
  variant?: MarkVariant
  className?: string
  style?: CSSProperties
  label?: string
}

/* The Kizunu mark. Renders the letter K from the display font directly.
   Sized by the container via font-size. */
export function KMark({ variant = 'full', className, style, label }: KMarkProps) {
  return (
    <span
      className={['kz-kmark', variant === 'scanned' ? 'kz-kmark--scanned' : undefined, className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      K
    </span>
  )
}
