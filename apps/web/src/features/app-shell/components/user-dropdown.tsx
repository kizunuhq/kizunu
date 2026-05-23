import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useLogout } from '@kizunu/api-client/identity/use-logout'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@kizunu/web/components/primitives/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@kizunu/web/components/primitives/sidebar'
import { CaretUpDown, Monitor, Moon, SignOut, Sun, User } from '@phosphor-icons/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTheme } from 'next-themes'

export function UserDropdown() {
  const { user } = useCurrentUser()
  if (!user) return null
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                <div className="flex flex-1 flex-col text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
                <CaretUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <UserDropdownContent />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function UserDropdownContent() {
  const navigate = useNavigate()
  const logout = useLogout()
  return (
    <DropdownMenuContent side="right" align="end" sideOffset={4} className="min-w-56">
      <DropdownMenuLabel className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
        Account
      </DropdownMenuLabel>
      <DropdownMenuItem render={<Link to="/settings/profile" />}>
        <User />
        Profile
      </DropdownMenuItem>
      <ThemeSubmenu />
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, { onSuccess: () => navigate({ to: '/auth/login' }) })
        }
      >
        <SignOut />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

function ThemeSubmenu() {
  const { theme = 'system', setTheme } = useTheme()
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <ThemeIcon value={theme} />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(next) => setTheme(typeof next === 'string' ? next : 'system')}
        >
          <DropdownMenuRadioItem value="light">
            <Sun />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

function ThemeIcon({ value }: { value: string }) {
  if (value === 'light') return <Sun />
  if (value === 'dark') return <Moon />
  return <Monitor />
}
