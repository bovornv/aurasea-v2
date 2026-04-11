'use client'

import { useTranslations } from 'next-intl'
import { useUser } from '@/providers/user-context'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Crown } from 'lucide-react'
import Link from 'next/link'

const planDetails = {
  starter: { price: '฿490', features: ['1 branch', '1 manager', '2 staff', '1 rec/day'] },
  growth: { price: '฿990', features: ['2 branches', '2 managers', '5 staff', '3 recs/day', 'Labour alerts'] },
  pro: { price: '฿2,490', features: ['3 branches', 'Unlimited team', 'Unlimited recs', 'Weekly PDF', 'Portfolio'] },
}

export default function BillingPage() {
  const { organization, branches, plan } = useUser()
  const t = useTranslations('settingsBilling')

  if (!organization) return null

  const details = planDetails[plan]
  const planBranchLimits = { starter: 1, growth: 2, pro: 3 }
  const trialDaysLeft = organization.plan_expires_at
    ? Math.max(0, Math.ceil((new Date(organization.plan_expires_at).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 lg:hidden mb-2">
        <Link href="/settings" className="p-1 text-slate-400 hover:text-slate-600 touch-target">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-lg font-medium text-slate-900 leading-heading">{t('title')}</h2>
      </div>
      <h2 className="text-lg font-medium text-slate-900 leading-heading hidden lg:block">{t('title')}</h2>

      {/* Current plan */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-amber-500" />
            <span className="text-lg font-medium text-slate-900">
              {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
            </span>
          </div>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, padding: '2px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--color-green-light)', color: 'var(--color-green-text)' }}>
            Active
          </span>
        </div>

        {trialDaysLeft !== null && trialDaysLeft > 0 && (
          <div style={{ marginBottom: 12, padding: '6px 14px', background: 'var(--color-accent-light)', color: 'var(--color-accent-text)', fontSize: 'var(--font-size-sm)', borderRadius: 'var(--radius-md)' }}>
            {t('trialRemaining', { days: trialDaysLeft })}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('price')}</span>
            <span className="font-medium">{details.price}/{t('month')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('branches')}</span>
            <span className="font-medium">{branches.length}/{planBranchLimits[plan]}</span>
          </div>
          {organization.plan_expires_at && (
            <div className="flex justify-between">
              <span className="text-slate-500">{t('expiresAt')}</span>
              <span className="font-medium">{formatDate(organization.plan_expires_at)}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-1">{t('includes')}</p>
          <ul className="space-y-0.5">
            {details.features.map((f, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}><span style={{ color: 'var(--color-positive)' }}>✓</span> {f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upgrade CTA */}
      {plan !== 'pro' && (
        <div style={{ background: 'var(--color-accent-light)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>{t('upgradeTitle')}</h3>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 12 }}>{t('upgradeDescription')}</p>
          <a href="mailto:hello@auraseaos.com?subject=Upgrade%20Plan" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="sm">{t('contactTeam')}</Button>
          </a>
        </div>
      )}
    </div>
  )
}
