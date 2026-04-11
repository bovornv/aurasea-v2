export function calculateAvgSpend(revenue: number, covers: number): number {
  if (covers <= 0) return 0
  return revenue / covers
}

export function calculateGrossMargin(revenue: number, cost: number): number {
  if (revenue <= 0) return 0
  return ((revenue - cost) / revenue) * 100
}

export function calculateCOGSPct(cost: number, revenue: number): number {
  if (revenue <= 0) return 0
  return (cost / revenue) * 100
}

export function calculateDailySalaryCost(monthlySalary: number, operatingDays: number): number {
  if (operatingDays <= 0) return 0
  return monthlySalary / operatingDays
}

export function calculateMinCoversForLabourTarget(
  dailyCost: number,
  labourTargetPct: number,
  avgSpend: number
): number {
  if (labourTargetPct <= 0 || avgSpend <= 0) return 0
  const minRevenue = dailyCost / (labourTargetPct / 100)
  return Math.ceil(minRevenue / avgSpend)
}

export function calculateRolling7DayAvgCost(
  costEntries: { date: string; cost: number | null }[]
): number {
  const validCosts = costEntries
    .filter((e) => e.cost != null && e.cost > 0)
    .map((e) => e.cost as number)
  if (validCosts.length === 0) return 0
  return validCosts.reduce((sum, c) => sum + c, 0) / validCosts.length
}
