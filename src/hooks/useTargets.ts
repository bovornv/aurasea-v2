'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Target } from '@/lib/supabase/types'

export function useTargets(branchId: string | undefined) {
  const [targets, setTargets] = useState<Target | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!branchId) return
    setLoading(true)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('targets')
      .select('*')
      .eq('branch_id', branchId)
      .maybeSingle()
      .then(({ data }: { data: Target | null }) => {
        setTargets(data)
        setLoading(false)
      })
  }, [branchId])

  return { targets, loading }
}
