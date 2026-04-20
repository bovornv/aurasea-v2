'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getEntryTable } from '@/lib/supabase/entry-tables'
import { getTodayBangkok } from '@/lib/businessDate'
import {
  computeDataCompleteness,
  isFnbRowComplete,
  isHotelRowComplete,
  type DataCompleteness,
  type FnbCompletenessRow,
  type HotelCompletenessRow,
} from '@/lib/calculations/dataCompleteness'

/**
 * Fetches the last 37 days of entries for the branch and returns the
 * shared data-completeness shape. 37 = 30 (window) + 7 (look-back needed
 * for consecutiveCompleteDays). Refetches when `branchId` or the passed
 * `refreshKey` change.
 *
 * Every tab renders a pill, so this hook runs once per page per venue —
 * it's a small query (one branch × ~37 rows) and Supabase's client-side
 * cache makes repeat loads cheap.
 */
export function useDataCompleteness(
  branchId: string | undefined,
  businessType: 'fnb' | 'accommodation' | undefined,
  refreshKey: number | string = 0,
): { completeness: DataCompleteness | null; loading: boolean } {
  const [completeness, setCompleteness] = useState<DataCompleteness | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!branchId || !businessType) {
      setCompleteness(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const today = getTodayBangkok()
    const start = new Date(today + 'T00:00:00')
    start.setDate(start.getDate() - 36)
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    const table = getEntryTable(businessType)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const columns = businessType === 'fnb'
      ? 'metric_date, revenue, total_customers, additional_cost_today'
      : 'metric_date, revenue, rooms_sold, additional_cost_today'
    db.from(table)
      .select(columns)
      .eq('branch_id', branchId)
      .gte('metric_date', startStr)
      .then(({ data }: { data: (FnbCompletenessRow | HotelCompletenessRow)[] | null }) => {
        const rows = data || []
        if (businessType === 'fnb') {
          setCompleteness(
            computeDataCompleteness(rows as FnbCompletenessRow[], isFnbRowComplete, today),
          )
        } else {
          setCompleteness(
            computeDataCompleteness(rows as HotelCompletenessRow[], isHotelRowComplete, today),
          )
        }
        setLoading(false)
      })
  }, [branchId, businessType, refreshKey])

  return { completeness, loading }
}
