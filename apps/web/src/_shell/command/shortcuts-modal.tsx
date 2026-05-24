import { Kbd } from '@kizunu/web/components/composed/kbd'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kizunu/web/components/primitives/dialog'

interface ShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Shortcut {
  keys: string[]
  description: string
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['⌘', 'K'], description: 'Open command palette' },
  { keys: ['['], description: 'Toggle sidebar' },
  { keys: ['?'], description: 'Show this shortcuts list' },
]

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Move through the dashboard without leaving the keyboard.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-border flex flex-col divide-y">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.description} className="flex items-center justify-between gap-3 py-2">
              <span className="text-foreground text-sm">{shortcut.description}</span>
              <span className="inline-flex items-center gap-1">
                {shortcut.keys.map((key, index) => (
                  <Kbd key={`${shortcut.description}-${index}`}>{key}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
