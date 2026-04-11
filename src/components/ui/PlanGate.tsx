'use client'

import { useTranslations } from 'next-intl'
import { Lock } from 'lucide-react'
import { useUser } from '@/providers/user-context'
import Link from 'next/link'

interface PlanGateProps {
  requiredPlan: 'growth' | 'pro'
  featureName: string
  children: React.ReactNode
}

const planLevel = { starter: 0, growth: 1, pro: 2 }

export function PlanGate({ requiredPlan, featureName, children }: PlanGateProps) {
  const { plan } = useUser()
  const t = useTranslations('planGate')

  if (planLevel[plan] >= planLevel[requiredPlan]) {
    return <>{children}</>
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-75">
      <div className="flex items-center gap-2 mb-2">
        <Lock size={16} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-600">{featureName}</span>
        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium uppercase">
          {requiredPlan}+
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-3 leading-body">
        {t('description')}
      </p>
      <Link
        href="/settings/billing"
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        {t('upgrade')}
      </Link>
    </div>
  )
}
