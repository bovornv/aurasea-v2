'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useBranchMetrics } from '@/hooks/useBranchMetrics'
import { useTargets } from '@/hooks/useTargets'
import { useUser } from '@/providers/user-context'
import { KpiCard } from '@/components/kpi-card'
import { BarChart } from '@/components/charts/BarChart'
import { LineChart } from '@/components/charts/LineChart'
import { PeriodSelector } from '@/components/ui/PeriodSelector'
import { PlanGate } from '@/components/ui/PlanGate'
import { formatChartDate, formatBaht, formatPct, groupByWeek, formatWeekRange } from '@/lib/formatters'
import { calculateDailySalaryCost } from '@/lib/calculations/fnb'
import { rolling7DayAvg } from '@/lib/calculations/rolling'

export function FnbTrendsView({ branchId }: { branchId: string }) {
  const [period, setPeriod] = useState<30 | 90>(30)
  const { data, loading } = useBranchMetrics(branchId, period)
  const { targets } = useTargets(branchId)
  const { plan } = useUser()
  const t = useTranslations('trends')

  const cogsTarget = Number(targets?.cogs_target) || 32
  const marginTarget = 100 - cogsTarget
  const coversTarget = Number(targets?.covers_target) || 75
  const avgSpendTarget = Number(targets?.avg_spend_target) || 0
  const monthlySalary = Number(targets?.monthly_salary) || 0
  const operatingDays = Number(targets?.operating_days) || 26

  const stats = useMemo(() => {
    if (data.length === 0) return null
    const margins = data.filter((d) => d.margin != null).map((d) => d.margin!)
    const covers = data.filter((d) => d.customers != null).map((d) => d.customers!)
    const spends = data.filter((d) => d.avg_ticket != null).map((d) => d.avg_ticket!)
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const dailyCost = calculateDailySalaryCost(monthlySalary, operatingDays)
    const avgRevenue = data.reduce((s, d) => s + d.revenue, 0) / data.length
    const avgLabour = avgRevenue > 0 && monthlySalary > 0 ? (dailyCost / avgRevenue) * 100 : null
    return { avgMargin: avg(margins), avgCovers: avg(covers), avgSpend: avg(spends), avgLabour }
  }, [data, monthlySalary, operatingDays])

  const weeks = useMemo(() => {
    return groupByWeek(data).slice(-4).map((week) => {
      const margins = week.filter((d) => d.margin != null).map((d) => d.margin!)
      const covers = week.filter((d) => d.customers != null).map((d) => d.customers!)
      const spends = week.filter((d) => d.avg_ticket != null).map((d) => d.avg_ticket!)
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      return { label: formatWeekRange(week.map((d) => d.metric_date)), avgMargin: avg(margins), avgCovers: avg(covers), avgSpend: avg(spends) }
    })
  }, [data])

  const rollingCosts = useMemo(() => {
    return data.map((d) => ({
      raw: d.avg_cost || 0,
      rolling: rolling7DayAvg(
        data.map((m) => ({ date: m.metric_date, value: m.avg_cost })),
        d.metric_date
      ),
    }))
  }, [data])

  const insight = useMemo(() => {
    if (!stats || data.length < 7) return null
    const marginBelow = stats.avgMargin < marginTarget
    const coversBelow = stats.avgCovers < coversTarget
    if (marginBelow && coversBelow) return `ทั้ง Margin และ Covers ต่ำกว่าเป้า — ตรวจสอบ COGS ก่อนเปิดร้านวันนี้และพิจารณาเพิ่ม covers ช่วงเที่ยง`
    if (marginBelow) return `Covers ตามเป้า แต่ Margin ยังต่ำกว่าเป้า ${formatPct(marginTarget - stats.avgMargin)}pts — น่าจะมาจาก COGS หรือ waste ลองตรวจสอบ portion size`
    if (coversBelow) return `Margin ดี ${formatPct(stats.avgMargin)} แต่ Covers ยังน้อย — เพิ่ม covers โดยไม่ต้องลดราคา เช่น lunch set หรือ promotion วันธรรมดา`
    return `Margin และ Covers ตามเป้า — Avg spend ${formatBaht(stats.avgSpend)} vs เป้า ${formatBaht(avgSpendTarget)} คือโอกาสต่อไป`
  }, [stats, marginTarget, coversTarget, avgSpendTarget, data.length])

  function getStatus(v: number, target: number): 'green' | 'amber' | 'red' | 'neutral' {
    if (v >= target) return 'green'
    if (v >= target * 0.9) return 'amber'
    return 'red'
  }

  if (loading) return <div style={{ padding: 'var(--space-10) 0', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Loading...</div>

  const chartLabels = data.map((d) => formatChartDate(d.metric_date))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>{t('title')}</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <KpiCard label="Gross Margin" value={formatPct(stats.avgMargin)} target={`${formatPct(marginTarget, 0)}`} status={getStatus(stats.avgMargin, marginTarget)} />
          <KpiCard label="Covers/day" value={Math.round(stats.avgCovers).toString()} target={`${coversTarget}`} status={getStatus(stats.avgCovers, coversTarget)} />
          <KpiCard label="Avg Spend" value={formatBaht(stats.avgSpend)} target={avgSpendTarget > 0 ? formatBaht(avgSpendTarget) : undefined} status="neutral" />
          <KpiCard label="Labour %" value={stats.avgLabour != null ? formatPct(stats.avgLabour) : 'ยังไม่ตั้งค่า'} status="neutral" />
        </div>
      )}

      {/* Margin chart */}
      <Section label={t('margin_daily')}>
        <LineChart
          labels={chartLabels}
          datasets={[{
            data: data.map((d) => d.margin != null ? d.margin : 0),
            color: '#1D9E75',
            label: 'Margin %',
            fill: true,
            fillColor: 'rgba(29,158,117,0.08)',
          }]}
          targetValue={marginTarget}
          targetLabel={`${t('target_line')} ${formatPct(marginTarget, 0)}`}
          yFormatter={(v) => formatPct(v, 0)}
        />
      </Section>

      {/* Covers chart */}
      <Section label={t('covers_daily')}>
        <BarChart
          labels={chartLabels}
          data={data.map((d) => d.customers || 0)}
          colors={data.map((d) => (d.customers || 0) >= coversTarget ? '#1D9E75' : '#534AB7')}
          targetValue={coversTarget}
          yFormatter={(v) => `${Math.round(v)} คน`}
        />
      </Section>

      {/* Sales + Avg spend dual axis */}
      <Section label="ยอดขายและ Avg spend/cover">
        <LineChart
          labels={chartLabels}
          datasets={[
            { data: data.map((d) => d.revenue), color: '#1D9E75', label: 'ยอดขาย (฿)' },
            { data: data.map((d) => d.avg_ticket || 0), color: '#BA7517', label: 'Avg spend (฿/คน)', yAxisID: 'y2' },
          ]}
          yFormatter={(v) => formatBaht(v)}
          y2Formatter={(v) => formatBaht(v)}
        />
      </Section>

      {/* Rolling cost — Growth+ */}
      <PlanGate requiredPlan="growth" featureName={t('cost_rolling')}>
        <Section label={t('cost_rolling')}>
          <LineChart
            labels={chartLabels}
            datasets={[
              { data: rollingCosts.map((c) => c.raw), color: 'rgba(186,117,23,0.4)', label: 'ต้นทุนจริง', dashed: true },
              { data: rollingCosts.map((c) => c.rolling), color: '#BA7517', label: 'ค่าเฉลี่ย 7 วัน' },
            ]}
            yFormatter={(v) => formatBaht(v)}
          />
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 6 }}>
            {t('rolling_note')}
          </p>
        </Section>
      </PlanGate>

      {/* Weekly summary */}
      <Section label={t('weekly_summary')}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 'var(--font-size-sm)', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>สัปดาห์</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>Margin</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>Covers/วัน</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>Avg Spend</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{w.label}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: w.avgMargin >= marginTarget ? 'var(--color-positive)' : 'var(--color-negative)' }}>{formatPct(w.avgMargin, 0)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{Math.round(w.avgCovers)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatBaht(w.avgSpend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Insight */}
      {plan !== 'starter' && insight && (
        <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-accent)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
          <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{t('trend_insight')}</p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>{insight}</p>
        </div>
      )}
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
