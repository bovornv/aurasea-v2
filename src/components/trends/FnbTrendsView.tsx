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

// Shared palette so the HTML legend swatches track the Chart.js line
// colours without drifting.
const COLORS = {
  margin: '#1D9E75',
  sales: '#1D9E75',
  avgSpend: '#BA7517',
  costActual: 'rgba(186,117,23,0.4)',
  costRolling: '#BA7517',
}

// F&B gross margin sanity band. Anything outside [0, 85] almost always
// means the cost field wasn't entered correctly — showing the chart as
// 100% in that case misleads owners. We return null instead so the
// chart renders an honest gap (via spanGaps: false).
const GROSS_MARGIN_MIN = 0
const GROSS_MARGIN_MAX = 85

function grossMarginPct(revenue: number, cost: number | null | undefined): number | null {
  if (!revenue || revenue <= 0) return null
  if (cost == null || cost <= 0) return null
  const pct = (1 - cost / revenue) * 100
  if (pct < GROSS_MARGIN_MIN || pct > GROSS_MARGIN_MAX) return null
  return Math.round(pct * 10) / 10
}

export function FnbTrendsView({ branchId }: { branchId: string }) {
  const [period, setPeriod] = useState<30 | 90>(30)
  const { data, loading } = useBranchMetrics(branchId, period)
  const { targets } = useTargets(branchId)
  const { plan } = useUser()
  const t = useTranslations('trends')
  const tCommon = useTranslations('common')

  const cogsTarget = Number(targets?.cogs_target) || 32
  const marginTarget = 100 - cogsTarget
  const coversTarget = Number(targets?.covers_target) || 75
  const avgSpendTarget = Number(targets?.avg_spend_target) || 0
  const monthlySalary = Number(targets?.monthly_salary) || 0
  const operatingDays = Number(targets?.operating_days) || 26

  // Recompute gross margin client-side from revenue + cost so we can
  // (a) show honest gaps when cost is missing, and (b) clamp suspicious
  // outliers that would otherwise paint as 100%.
  const dailyMargin = useMemo(
    () => data.map((d) => grossMarginPct(d.revenue, d.additional_cost_today)),
    [data],
  )

  const stats = useMemo(() => {
    if (data.length === 0) return null
    const validMargins = dailyMargin.filter((m): m is number => m != null)
    const covers = data.filter((d) => d.customers != null).map((d) => d.customers!)
    const spends = data.filter((d) => d.avg_ticket != null).map((d) => d.avg_ticket!)
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    // Overall gross margin: aggregate totals across the whole window,
    // not an average-of-averages (which biases when some days lack cost).
    const totalRevenue = data.reduce((s, d) => s + (d.revenue || 0), 0)
    const totalCost = data.reduce((s, d) => s + (d.additional_cost_today || 0), 0)
    const avgMargin = totalRevenue > 0 && totalCost > 0
      ? Math.round(((1 - totalCost / totalRevenue) * 100) * 10) / 10
      : validMargins.length > 0
      ? avg(validMargins)
      : 0

    const dailyCost = calculateDailySalaryCost(monthlySalary, operatingDays)
    const avgRevenue = totalRevenue / data.length
    const avgLabour = avgRevenue > 0 && monthlySalary > 0 ? (dailyCost / avgRevenue) * 100 : null
    return { avgMargin, avgCovers: avg(covers), avgSpend: avg(spends), avgLabour }
  }, [data, dailyMargin, monthlySalary, operatingDays])

  // Weekly summary — aggregate sum(rev)/sum(cost) per week instead of
  // averaging the daily margin field (which over-weights null-cost days
  // and explodes to 48-87% ranges).
  const weeks = useMemo(() => {
    return groupByWeek(data).slice(-4).map((week) => {
      const weekRevenue = week.reduce((s, d) => s + (d.revenue || 0), 0)
      const weekCost = week.reduce((s, d) => s + (d.additional_cost_today || 0), 0)
      const weekMargin = weekRevenue > 0 && weekCost > 0
        ? Math.round(((1 - weekCost / weekRevenue) * 100) * 10) / 10
        : null
      const daysMissingCost = week.filter(
        (d) => (d.revenue || 0) > 0 && (d.additional_cost_today == null || d.additional_cost_today <= 0),
      ).length
      const covers = week.filter((d) => d.customers != null).map((d) => d.customers!)
      const spends = week.filter((d) => d.avg_ticket != null).map((d) => d.avg_ticket!)
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      return {
        label: formatWeekRange(week.map((d) => d.metric_date)),
        weekMargin,
        daysMissingCost,
        avgCovers: avg(covers),
        avgSpend: avg(spends),
      }
    })
  }, [data])

  const hasMissingWeek = weeks.some((w) => w.daysMissingCost > 0)

  const rollingCosts = useMemo(() => {
    return data.map((d) => ({
      raw: d.avg_cost || 0,
      rolling: rolling7DayAvg(
        data.map((m) => ({ date: m.metric_date, value: m.avg_cost })),
        d.metric_date,
      ),
    }))
  }, [data])

  const insight = useMemo(() => {
    if (!stats || data.length < 7) return null
    const marginBelow = stats.avgMargin < marginTarget
    const coversBelow = stats.avgCovers < coversTarget
    if (marginBelow && coversBelow) return t('insight_fnb_both_below')
    if (marginBelow) return t('insight_fnb_margin_below', { gap: formatPct(marginTarget - stats.avgMargin) })
    if (coversBelow) return t('insight_fnb_covers_below', { margin: formatPct(stats.avgMargin) })
    return t('insight_fnb_on_track', {
      current: formatBaht(stats.avgSpend),
      target: formatBaht(avgSpendTarget),
    })
  }, [stats, marginTarget, coversTarget, avgSpendTarget, data.length, t])

  function getStatus(v: number, target: number): 'green' | 'amber' | 'red' | 'neutral' {
    if (v >= target) return 'green'
    if (v >= target * 0.9) return 'amber'
    return 'red'
  }

  if (loading) return <div style={{ padding: 'var(--space-10) 0', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>{tCommon('loading')}</div>

  const chartLabels = data.map((d) => formatChartDate(d.metric_date))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>{t('title')}</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <KpiCard label={t('kpi_gross_margin')} value={formatPct(stats.avgMargin)} target={`${formatPct(marginTarget, 0)}`} status={getStatus(stats.avgMargin, marginTarget)} />
          <KpiCard label={t('kpi_covers_day')} value={Math.round(stats.avgCovers).toString()} target={`${coversTarget}`} status={getStatus(stats.avgCovers, coversTarget)} />
          <KpiCard label={t('kpi_avg_spend')} value={formatBaht(stats.avgSpend)} target={avgSpendTarget > 0 ? formatBaht(avgSpendTarget) : undefined} status="neutral" />
          <KpiCard label={t('kpi_labour')} value={stats.avgLabour != null ? formatPct(stats.avgLabour) : t('not_configured')} status="neutral" />
        </div>
      )}

      {/* Gross margin chart — honest gaps for missing-cost days */}
      <Section label={t('margin_daily')}>
        <LineChart
          labels={chartLabels}
          datasets={[{
            data: dailyMargin,
            color: COLORS.margin,
            label: t('kpi_gross_margin'),
            fill: true,
            fillColor: 'rgba(29,158,117,0.08)',
          }]}
          targetValue={marginTarget}
          targetLabel={`${t('target_line')} ${formatPct(marginTarget, 0)}`}
          yFormatter={(v) => formatPct(v, 0)}
          yMax={100}
          yMin={0}
          spanGaps={false}
        />
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 6, lineHeight: 1.5 }}>
          {t('gross_margin_note')}
        </p>
      </Section>

      {/* Covers chart */}
      <Section label={t('covers_daily')}>
        <BarChart
          labels={chartLabels}
          data={data.map((d) => d.customers || 0)}
          colors={data.map((d) => (d.customers || 0) >= coversTarget ? '#1D9E75' : '#534AB7')}
          targetValue={coversTarget}
          yFormatter={(v) => `${Math.round(v)} ${t('covers_unit')}`}
        />
      </Section>

      {/* Sales + Avg spend dual axis */}
      <Section label={t('chart_sales_avg')}>
        <ChartLegend
          items={[
            { color: COLORS.sales, label: t('line_sales'), axisHint: t('left_axis') },
            { color: COLORS.avgSpend, label: t('line_avg_spend'), axisHint: t('right_axis') },
          ]}
        />
        <LineChart
          labels={chartLabels}
          datasets={[
            { data: data.map((d) => d.revenue), color: COLORS.sales, label: t('line_sales') },
            { data: data.map((d) => d.avg_ticket || 0), color: COLORS.avgSpend, label: t('line_avg_spend'), yAxisID: 'y2' },
          ]}
          yFormatter={(v) => formatBaht(v)}
          y2Formatter={(v) => formatBaht(v)}
        />
      </Section>

      {/* Rolling cost — Growth+ */}
      <PlanGate requiredPlan="growth" featureName={t('cost_rolling')}>
        <Section label={t('cost_rolling')}>
          <ChartLegend
            items={[
              { color: COLORS.costActual, label: t('line_cost_actual'), dashed: true },
              { color: COLORS.costRolling, label: t('line_cost_rolling') },
            ]}
          />
          <LineChart
            labels={chartLabels}
            datasets={[
              { data: rollingCosts.map((c) => c.raw), color: COLORS.costActual, label: t('line_cost_actual'), dashed: true },
              { data: rollingCosts.map((c) => c.rolling), color: COLORS.costRolling, label: t('line_cost_rolling') },
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
                <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>{t('week_col')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>{t('margin_col')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>{t('covers_col')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>{t('avg_spend_col')}</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{w.label}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: w.weekMargin == null ? 'var(--color-text-tertiary)' : w.weekMargin >= marginTarget ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                    {w.weekMargin == null ? '—' : formatPct(w.weekMargin, 0)}
                    {w.daysMissingCost > 0 && w.weekMargin != null && <span style={{ color: 'var(--color-text-tertiary)' }}> *</span>}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{Math.round(w.avgCovers)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatBaht(w.avgSpend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMissingWeek && (
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
            {t('no_cost_note')}
          </p>
        )}
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

interface LegendItem {
  color: string
  label: string
  axisHint?: string
  dashed?: boolean
}

function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10, fontSize: 12 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 24,
              height: 0,
              flexShrink: 0,
              borderTop: `2px ${item.dashed ? 'dashed' : 'solid'} ${item.color}`,
              borderRadius: 1,
            }}
          />
          <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
          {item.axisHint && (
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>({item.axisHint})</span>
          )}
        </div>
      ))}
    </div>
  )
}
