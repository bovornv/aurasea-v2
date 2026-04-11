import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/auth/get-user-context'
import { UserProvider } from '@/providers/user-context'
import { TabBar } from '@/components/tab-bar'
import { Sidebar } from '@/components/sidebar'
import { ResponsiveHeader } from '@/components/responsive-header'
import { getTranslations } from 'next-intl/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userContext = await getUserContext(
    supabase,
    user.id,
    user.email || ''
  )

  const t = await getTranslations('noOrg')

  // If user has no organization, show a message
  if (!userContext.organization && !userContext.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: 'var(--page-padding-mobile)' }}>
        <div className="text-center">
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            {t('title')}
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {t('message')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <UserProvider initialContext={userContext}>
      {/* Desktop/Tablet: Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className="min-h-screen"
        style={{
          marginLeft: 0,
          paddingBottom: 'calc(var(--bottomnav-height) + 16px)',
        }}
      >
        {/* Responsive margin for sidebar */}
        <style>{`
          @media (min-width: 768px) { .app-content-area { margin-left: var(--sidebar-collapsed) !important; padding-bottom: 0 !important; } }
          @media (min-width: 1280px) { .app-content-area { margin-left: var(--sidebar-width) !important; } }
        `}</style>
        <div className="app-content-area" style={{ marginLeft: 0, paddingBottom: 'calc(var(--bottomnav-height) + 16px)' }}>
          <ResponsiveHeader />
          <main
            style={{
              maxWidth: 'var(--content-max-width)',
              margin: '0 auto',
              padding: '20px var(--page-padding-mobile)',
            }}
          >
            <style>{`@media (min-width: 1280px) { main { padding: 24px var(--page-padding-desktop) !important; } }`}</style>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile: Bottom tab bar */}
      <TabBar />
    </UserProvider>
  )
}
