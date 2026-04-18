'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { BranchDailyMetric } from '@/hooks/useBranchMetrics'
import { toBangkokDateStr } from '@/lib/businessDate'

// Thai holidays 2026 (future dates from April)
const thaiHolidays2026 = ['2026-05-01', '2026-05-04', '2026-05-22', '2026-06-03', '2026-07-28', '2026-08-12']

export function DemandCalendar({ data }: { data: BranchDailyMetric[] }) {
  const t = useTranslations('pricing')

  const calendar = useMemo(() => {
    // Calculate avg occupancy by day of week (0=Sun ... 6=Sat)
    const byDow: number[][] = [[], [], [], [], [], [], []]
    data.forEach((d) => {
      if (d.occupancy_rate != null) {
        const dow = new Date(d.metric_date + 'T00:00:00').getDay()
        byDow[dow].push(d.occupancy_rate)
      }
    })
    const avgByDow = byDow.map((arr) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 50
    )

    // Generate next 30 days
    const days: { date: string; label: string; level: 'low' | 'medium' | 'high' }[] = []
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const dateStr = toBangkokDateStr(d.toISOString())
      const dow = d.getDay()
      const avg = avgByDow[dow]
      const isHoliday = thaiHolidays2026.includes(dateStr)

      let level: 'low' | 'medium' | 'high' = 'low'
      if (isHoliday || avg > 80) level = 'high'
      else if (avg >= 60) level = 'medium'

      days.push({ date: dateStr, label: `${d.getDate()}`, level })
    }
    return days
  }, [data])

  // Pad to start on Monday
  const firstDay = new Date(calendar[0]?.date + 'T00:00:00')
  const startPad = (firstDay.getDay() + 6) % 7 // Mon=0

  const colors = {
    low: { bg: 'var(--color-bg-surface)', text: 'var(--color-text-secondary)' },
    medium: { bg: 'var(--color-accent-light)', text: 'var(--color-accent-text)' },
    high: { bg: 'var(--color-accent)', text: 'white' },
  }

  return (
    <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
      <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{t('demand_calendar')}</p>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--color-text-tertiary)', padding: 2 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {Array(startPad).fill(null).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {calendar.map((day) => (
          <div
            key={day.date}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              fontSize: 11,
              fontWeight: 500,
              background: colors[day.level].bg,
              color: colors[day.level].text,
            }}
          >
            {day.label}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4" style={{ marginTop: 10 }}>
        {[
          { level: 'low' as const, label: t('demand_low') },
          { level: 'medium' as const, label: t('demand_medium') },
          { level: 'high' as const, label: t('demand_high') },
        ].map((item) => (
          <div key={item.level} className="flex items-center gap-1">
            <span style={{ width: 12, height: 12, borderRadius: 2, background: colors[item.level].bg, border: item.level === 'low' ? '1px solid var(--color-border)' : 'none' }} />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
