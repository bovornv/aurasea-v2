'use client'

import { useTranslations } from 'next-intl'
import { useDataCompleteness } from '@/hooks/useDataCompleteness'
import type { CompletenessLevel } from '@/lib/calculations/dataCompleteness'

interface Props {
  branchId: string | undefined
  businessType: 'fnb' | 'accommodation' | undefined
}

const LEVEL_COLORS: Record<CompletenessLevel, string> = {
  green: 'var(--color-positive)',
  amber: 'var(--color-amber)',
  red: 'var(--color-negative)',
}

/**
 * Always-visible data-completeness panel on the Cost tab. Uses the shared
 * selector so this number can never drift from the page-title pill.
 *
 * This replaces a previous "Accuracy" panel that ran the raw entry rate
 * through a non-linear fudge formula (7/30 days → "12% accurate"). The
 * new display is linear: daysPresent/30 × 100.
 */
export function AccuracyIndicator({ branchId, businessType }: Props) {
  const { completeness, loading } = useDataCompleteness(branchId, businessType)
  const t = useTranslations('dataCompleteness')
  const tCost = useTranslations('cost')

  if (loading || !completeness) return null

  const color = LEVEL_COLORS[completeness.level]
  // Single-sentence CTA picked once by bucket — specific enough to be
  // actionable without piling on copy.
  const note = completeness.percentage < 50
    ? tCost('fill_cost_daily')
    : completeness.percentage < 80
    ? tCost('accuracy_great')
    : tCost('accuracy_excellent')

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
      }}
    >
      <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--color-bg-surface)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${completeness.percentage}%`,
            height: '100%',
            borderRadius: 4,
            background: color,
            transition: 'width 0.3s',
          }}
        />
      </div>

      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 6 }}>
        <span style={{ fontWeight: 500 }}>{t('label')}:</span>{' '}
        {completeness.percentage}% — {t('subtext', { days: completeness.daysPresent })}
      </p>
      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
        {note}
      </p>
    </div>
  )
}
