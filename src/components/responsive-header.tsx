'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/providers/user-context'
import { createClient } from '@/lib/supabase/client'
import { BranchSwitcher } from './branch-switcher'
import { MobileDrawer } from './mobile-drawer'
import { LocaleSwitcher } from './locale-switcher'
import { LogOut } from 'lucide-react'

export function ResponsiveHeader() {
  const { organization } = useUser()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center gap-3"
        style={{
          height: 'var(--topbar-height)',
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 var(--page-padding-mobile)',
        }}
      >
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden flex flex-col justify-center items-center touch-target"
          style={{ width: 32, height: 32, background: 'transparent', border: 'none', gap: 4 }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: 'block',
                width: 16,
                height: 1.5,
                background: 'var(--color-text-secondary)',
                borderRadius: 0,
              }}
            />
          ))}
        </button>

        {/* Logo */}
        <span
          style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-accent)',
            letterSpacing: '-0.02em',
          }}
        >
          {organization?.name || 'aurasea'}
        </span>

        <div className="flex-1" />

        {/* Branch pill — inline on topbar */}
        <div className="hidden md:block">
          <BranchSwitcher />
        </div>

        {/* Language toggle */}
        <div className="hidden lg:block">
          <LocaleSwitcher />
        </div>

        {/* Logout button — always visible */}
        <button
          onClick={handleLogout}
          className="touch-target flex items-center justify-center"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            padding: 4,
          }}
          title="ออกจากระบบ"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Mobile branch pills below topbar */}
      <div
        className="md:hidden"
        style={{
          padding: '10px var(--page-padding-mobile)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
        }}
      >
        <BranchSwitcher />
      </div>

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  )
}
