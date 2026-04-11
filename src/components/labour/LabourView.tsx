'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useBranchMetrics } from '@/hooks/useBranchMetrics'
import { useTargets } from '@/hooks/useTargets'
import { KpiCard } from '@/components/kpi-card'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { formatBaht, formatPct, formatChartDate, groupByWeek, formatWeekRange } from '@/lib/formatters'
import { calculateDailySalaryCost, calculateMinRevenueForLabourTarget, calculateMinRoomsForLabourTarget } from '@/lib/calculations/hotel'
import { calculateMinCoversForLabourTarget } from '@/lib/calculations/fnb'
import Link from 'next/link'

interface Props {
  branchId: string
  isHotel: boolean
  totalRooms: number
}

export function LabourView({ branchId, isHotel }: Props) {
  const { data, loading } = useBranchMetrics(branchId, 30)
  const { targets } = useTargets(branchId)
  const t = useTranslations('labour')

  const monthlySalary = Number(targets?.monthly_salary) || 0
  const operatingDays = Number(targets?.operating_days) || 30
  const labourTarget = Number(targets?.labour_target) || 30
  const adrTarget = Number(targets?.adr_target) || 0
  const avgSpendTarget = Number(targets?.avg_spend_target) || 0

  const dailyCost = calculateDailySalaryCost(monthlySalary, operatingDays)
  const minRevenue = calculateMinRevenueForLabourTarget(dailyCost, labourTarget)

  // Stats
  const stats = useMemo(() => {
    if (data.length === 0 || monthlySalary <= 0) return null
    const labourPcts = data.map((d) => d.revenue > 0 ? (dailyCost / d.revenue) * 100 : 0)
    const avgLabour = labourPcts.reduce((a, b) => a + b, 0) / labourPcts.length
    const daysOver = labourPcts.filter((p) => p > labourTarget).length
    const latest = data[data.length - 1]
    const todayRevenue = latest?.revenue || 0
    const todayLabour = todayRevenue > 0 ? (dailyCost / todayRevenue) * 100 : 0
    const breakevenPct = minRevenue > 0 ? Math.min(100, (todayRevenue / minRevenue) * 100) : 0

    // Waste estimate
    const wasteTotal = labourPcts.reduce((sum, pct, i) => {
      if (pct > labourTarget && data[i].revenue > 0) {
        const excessPct = (pct - labourTarget) / 100
        return sum + excessPct * data[i].revenue
      }
      return sum
    }, 0)

    return { avgLabour, daysOver, todayRevenue, todayLabour, breakevenPct, wasteTotal }
  }, [data, monthlySalary, dailyCost, labourTarget, minRevenue])

  // Weekly labour data
  const weeks = useMemo(() => {
    return groupByWeek(data).slice(-4).map((week) => {
      const weekRevenue = week.reduce((s, d) => s + d.revenue, 0)
      const weekCost = dailyCost * week.length
      const labourPct = weekRevenue > 0 ? (weekCost / weekRevenue) * 100 : 0
      return { label: formatWeekRange(week.map((d) => d.metric_date)), labourPct, revenue: weekRevenue }
    })
  }, [data, dailyCost])

  // Insight text
  const insight = useMemo(() => {
    if (!stats) return null
    if (stats.breakevenPct >= 100) {
      return `รายได้วันนี้ ${formatBaht(stats.todayRevenue)} เหนือ breakeven ${formatBaht(minRevenue)} — Labour cost ${formatPct(stats.todayLabour)} อยู่ในเกณฑ์ที่ดี`
    }
    return `รายได้วันนี้ ${formatBaht(stats.todayRevenue)} ยังต่ำกว่า breakeven ${formatBaht(minRevenue)} — ต้องการรายได้เพิ่มอีก ${formatBaht(minRevenue - stats.todayRevenue)} เพื่อให้ Labour% อยู่ที่เป้า`
  }, [stats, minRevenue])

  if (loading) return <div style={{ padding: 'var(--space-10) 0', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Loading...</div>

  if (monthlySalary <= 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>{t('title')}</h2>
        <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 12 }}>{t('setup_prompt')}</p>
          <Link href="/settings/targets" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-accent)', textDecoration: 'none' }}>Settings → Targets →</Link>
        </div>
      </div>
    )
  }

  const chartLabels = data.map((d) => formatChartDate(d.metric_date))
  const labourData = data.map((d) => d.revenue > 0 ? (dailyCost / d.revenue) * 100 : 0)
  const secondaryData = isHotel ? data.map((d) => d.occupancy_rate || 0) : data.map((d) => d.customers || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>{t('title')}</h2>

      {/* 4 KPI cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <KpiCard label={t('avg_labour_pct')} value={formatPct(stats.avgLabour)} target={formatPct(labourTarget, 0)} status={stats.avgLabour <= labourTarget ? 'green' : stats.avgLabour <= labourTarget + 5 ? 'amber' : 'red'} primary />
          <KpiCard label={t('days_over_target')} value={`${stats.daysOver} / 30`} status={stats.daysOver <= 3 ? 'green' : stats.daysOver <= 8 ? 'amber' : 'red'} />
          <KpiCard label={t('daily_cost')} value={formatBaht(dailyCost)} status="neutral" />
          <KpiCard label={t('min_revenue')} value={formatBaht(minRevenue)} subLabel={isHotel ? `≈ ${calculateMinRoomsForLabourTarget(minRevenue, adrTarget)} ห้อง` : `≈ ${calculateMinCoversForLabourTarget(dailyCost, labourTarget, avgSpendTarget)} covers`} status="neutral" />
        </div>
      )}

      {/* Dual-axis chart: Labour% vs Occupancy/Covers */}
      <Section label={`Labour% vs ${isHotel ? 'Occupancy' : 'Covers'}`}>
        <LineChart
          labels={chartLabels}
          datasets={[
            { data: labourData, color: '#A32D2D', label: 'Labour%' },
            { data: secondaryData, color: 'rgba(29,158,117,0.6)', label: isHotel ? 'Occupancy%' : 'Covers', yAxisID: 'y2' },
          ]}
          targetValue={labourTarget}
          targetLabel={`${t('avg_labour_pct')} ${formatPct(labourTarget, 0)}`}
          yFormatter={(v) => formatPct(v, 0)}
          y2Formatter={isHotel ? (v) => formatPct(v, 0) : (v) => `${Math.round(v)}`}
        />
      </Section>

      {/* Breakeven gauge */}
      {stats && (
        <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{t('breakeven_today')}</p>
          <div style={{ width: '100%', height: 10, borderRadius: 5, background: 'var(--color-bg-surface)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, stats.breakevenPct)}%`, height: '100%', borderRadius: 5, background: stats.breakevenPct >= 100 ? 'var(--color-positive)' : stats.breakevenPct >= 70 ? 'var(--color-amber)' : 'var(--color-negative)', transition: 'width 0.3s' }} />
          </div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 6 }}>
            {formatBaht(stats.todayRevenue)} / {formatBaht(minRevenue)} — {stats.breakevenPct >= 100 ? t('above_breakeven') : t('below_breakeven')}
          </p>
        </div>
      )}

      {/* Insight */}
      {insight && (
        <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-accent)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>{insight}</p>
        </div>
      )}

      {/* Revenue vs fixed cost chart */}
      <Section label="รายได้ vs ต้นทุนแรงงาน">
        <LineChart
          labels={chartLabels}
          datasets={[
            { data: data.map((d) => d.revenue), color: '#1D9E75', label: 'รายได้จริง' },
            { data: data.map(() => dailyCost), color: '#A32D2D', label: 'ต้นทุนแรงงาน/วัน', dashed: true },
            { data: data.map(() => minRevenue), color: '#BA7517', label: 'Breakeven', dashed: true },
          ]}
          yFormatter={(v) => formatBaht(v)}
        />
      </Section>

      {/* Waste estimate */}
      {stats && stats.wasteTotal > 0 && (
        <div style={{ background: 'var(--color-red-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
          <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{t('waste_estimate')}</p>
          <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 500, color: 'var(--color-negative)' }}>{formatBaht(stats.wasteTotal)}</p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>ถ้า Labour% อยู่ที่เป้า {formatPct(labourTarget, 0)} ทุกวัน จะประหยัดได้ประมาณนี้ใน 30 วัน</p>
        </div>
      )}

      {/* Weekly summary */}
      <Section label={t('weekly_summary')}>
        <BarChart
          labels={weeks.map((w) => w.label)}
          data={weeks.map((w) => w.labourPct)}
          colors={weeks.map((w) => w.labourPct <= labourTarget ? '#1D9E75' : w.labourPct <= labourTarget + 5 ? '#BA7517' : '#A32D2D')}
          targetValue={labourTarget}
          yFormatter={(v) => formatPct(v, 0)}
          height={120}
        />
      </Section>

      {/* Settings shortcut */}
      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
        <div className="flex justify-between" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
          <span>เงินเดือน/เดือน</span><span>{formatBaht(monthlySalary)}</span>
        </div>
        <div className="flex justify-between" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          <span>วันทำงาน</span><span>{operatingDays} วัน</span>
        </div>
        <div className="flex justify-between" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          <span>เป้า Labour%</span><span>{formatPct(labourTarget, 0)}</span>
        </div>
        <Link href="/settings/targets" style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', marginTop: 8, textDecoration: 'none' }}>แก้ไขใน Settings →</Link>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
      <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>{label}</p>
      {children}
    </div>
  )
}
