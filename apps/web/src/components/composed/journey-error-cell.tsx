import { ArrowRight } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

interface JourneyErrorCellProps {
  errorReason: string | null
}

interface ErrorRecipe {
  label: string
  to: string
}

const FIXED_RECIPES: ReadonlyMap<string, ErrorRecipe> = new Map([
  ['no_channel', { label: 'No channel access', to: '/settings/channels' }],
  ['template_required', { label: 'Template required', to: '/workspace/cadences' }],
  ['owner_not_mapped', { label: 'Owner not mapped', to: '/settings/connectors' }],
  ['owner_lookup_failed', { label: 'Owner lookup failed', to: '/settings/connectors' }],
])

function recipeFor(reason: string): ErrorRecipe {
  const fixed = FIXED_RECIPES.get(reason)
  if (fixed) return fixed
  if (reason.startsWith('template_variable_missing')) {
    return {
      label: `Template variable missing — ${variableName(reason)}`,
      to: '/workspace/cadences',
    }
  }
  if (reason.startsWith('template_variable_unknown')) {
    return {
      label: `Template variable unknown — ${variableName(reason)}`,
      to: '/workspace/cadences',
    }
  }
  return { label: 'Provider failure', to: '/settings/channels' }
}

function variableName(reason: string): string {
  const parts = reason.split(':')
  return parts.length > 1 ? parts.slice(1).join(':') : 'unknown'
}

export function JourneyErrorCell({ errorReason }: JourneyErrorCellProps) {
  if (!errorReason) return <span className="text-muted-foreground">—</span>
  const recipe = recipeFor(errorReason)
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="text-amber-700">{recipe.label}</span>
      <Link
        to={recipe.to}
        className="text-foreground hover:text-foreground/80 inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
      >
        Fix it
        <ArrowRight weight="bold" />
      </Link>
    </span>
  )
}
