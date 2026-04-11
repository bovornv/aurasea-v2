'use client'

import { useTranslations } from 'next-intl'
import { formatWeekday } from '@/lib/format'

interface EntryStatusPanelProps {
  metrics: { metric_date: string }[]
}

export function EntryStatusPanel({ metrics }: EntryStatusPanelProps) {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')

  const days: { date: string; label: string; hasEntry: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      label: formatWeekday(dateStr),
      hasEntry: metrics.some((m) => m.metric_date === dateStr),
    })
  }

  const entryCount = days.filter((d) => d.hasEntry).length

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
          {t('entryStatus')}
        </p>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
          {entryCount}/7 {tCommon('days')}
        </span>
      </div>
      <div className="flex justify-between gap-2">
        {days.map((day) => (
          <div key={day.date} className="flex flex-col items-center" style={{ gap: 4 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
                background: day.hasEntry ? 'var(--color-green-light)' : 'var(--color-bg-surface)',
                color: day.hasEntry ? 'var(--color-green)' : 'var(--color-text-tertiary)',
              }}
            >
              {day.hasEntry ? '✓' : '–'}
            </div>
            <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
