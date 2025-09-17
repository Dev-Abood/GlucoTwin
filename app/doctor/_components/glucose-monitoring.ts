// glucose-monitoring.ts

export type GlucoseThresholdValues = {
  hyperglycemiaBeforeMeal: number
  hyperglycemiaAfterMeal: number
  hyperglycemiaMajor: number
  hypoglycemia: number
  hypoglycemiaMajor: number
  frequentThreshold: number
}

export const DEFAULT_THRESHOLDS: GlucoseThresholdValues = {
  hyperglycemiaBeforeMeal: 95,
  hyperglycemiaAfterMeal: 140,
  hyperglycemiaMajor: 180,
  hypoglycemia: 70,
  hypoglycemiaMajor: 54,
  frequentThreshold: 3,
}

export type GlucoseReading = {
  level: number
  type: 'BEFORE_BREAKFAST' | 'AFTER_BREAKFAST' | 'BEFORE_LUNCH' | 'AFTER_LUNCH' | 'BEFORE_DINNER' | 'AFTER_DINNER'
  date: Date
}

// Individual alert status for each category
export type AlertStatus = {
  hasAlert: boolean
  count: number
  lastOccurrence?: Date
  severity: 'none' | 'warning' | 'danger' | 'critical'
}

// Detailed glucose alerts breakdown
export type DetailedGlucoseAlerts = {
  hyperglycemia: AlertStatus
  hyperglycemiaFrequent: AlertStatus
  hyperglycemiaMajor: AlertStatus
  hypoglycemia: AlertStatus
  hypoglycemiaFrequent: AlertStatus
  hypoglycemiaMajor: AlertStatus
  summary: {
    totalAlerts: number
    highestSeverity: 'normal' | 'warning' | 'danger' | 'critical'
  }
}

export function analyzeDetailedGlucoseReadings(
  readings: GlucoseReading[],
  thresholds: GlucoseThresholdValues
): DetailedGlucoseAlerts {
  // Get readings from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentReadings = readings.filter(reading => reading.date >= sevenDaysAgo)

  // Initialize all alert statuses
  const alerts: DetailedGlucoseAlerts = {
    hyperglycemia: { hasAlert: false, count: 0, severity: 'none' },
    hyperglycemiaFrequent: { hasAlert: false, count: 0, severity: 'none' },
    hyperglycemiaMajor: { hasAlert: false, count: 0, severity: 'none' },
    hypoglycemia: { hasAlert: false, count: 0, severity: 'none' },
    hypoglycemiaFrequent: { hasAlert: false, count: 0, severity: 'none' },
    hypoglycemiaMajor: { hasAlert: false, count: 0, severity: 'none' },
    summary: { totalAlerts: 0, highestSeverity: 'normal' }
  }

  // Analyze Hyperglycemia Major (Critical - above major threshold)
  const hyperMajorReadings = recentReadings.filter(r => r.level >= thresholds.hyperglycemiaMajor)
  if (hyperMajorReadings.length > 0) {
    alerts.hyperglycemiaMajor = {
      hasAlert: true,
      count: hyperMajorReadings.length,
      lastOccurrence: hyperMajorReadings[0].date,
      severity: 'critical'
    }
  }

  // Analyze Regular Hyperglycemia (Warning - above normal but below major)
  const beforeMealReadings = recentReadings.filter(r => 
    r.type === 'BEFORE_BREAKFAST' || r.type === 'BEFORE_LUNCH' || r.type === 'BEFORE_DINNER'
  )
  const afterMealReadings = recentReadings.filter(r => 
    r.type === 'AFTER_BREAKFAST' || r.type === 'AFTER_LUNCH' || r.type === 'AFTER_DINNER'
  )

  const beforeMealHyper = beforeMealReadings.filter(r => 
    r.level >= thresholds.hyperglycemiaBeforeMeal && r.level < thresholds.hyperglycemiaMajor
  )
  const afterMealHyper = afterMealReadings.filter(r => 
    r.level >= thresholds.hyperglycemiaAfterMeal && r.level < thresholds.hyperglycemiaMajor
  )

  const totalRegularHyper = [...beforeMealHyper, ...afterMealHyper]
  if (totalRegularHyper.length > 0) {
    alerts.hyperglycemia = {
      hasAlert: true,
      count: totalRegularHyper.length,
      lastOccurrence: totalRegularHyper.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date,
      severity: 'warning'
    }
  }

  // Analyze Hyperglycemia Frequent (Danger - frequent elevated readings)
  const allHyperReadings = recentReadings.filter(r => 
    r.level >= Math.min(thresholds.hyperglycemiaBeforeMeal, thresholds.hyperglycemiaAfterMeal)
  )
  if (allHyperReadings.length >= thresholds.frequentThreshold) {
    alerts.hyperglycemiaFrequent = {
      hasAlert: true,
      count: allHyperReadings.length,
      lastOccurrence: allHyperReadings[0].date,
      severity: 'danger'
    }
  }

  // Analyze Hypoglycemia Major (Critical - below major threshold)
  const hypoMajorReadings = recentReadings.filter(r => r.level <= thresholds.hypoglycemiaMajor)
  if (hypoMajorReadings.length > 0) {
    alerts.hypoglycemiaMajor = {
      hasAlert: true,
      count: hypoMajorReadings.length,
      lastOccurrence: hypoMajorReadings[0].date,
      severity: 'critical'
    }
  }

  // Analyze Regular Hypoglycemia (Warning - below normal but above major)
  const regularHypoReadings = recentReadings.filter(r => 
    r.level <= thresholds.hypoglycemia && r.level > thresholds.hypoglycemiaMajor
  )
  if (regularHypoReadings.length > 0) {
    alerts.hypoglycemia = {
      hasAlert: true,
      count: regularHypoReadings.length,
      lastOccurrence: regularHypoReadings[0].date,
      severity: 'warning'
    }
  }

  // Analyze Hypoglycemia Frequent (Danger - frequent low readings)
  const allHypoReadings = recentReadings.filter(r => r.level <= thresholds.hypoglycemia)
  if (allHypoReadings.length >= thresholds.frequentThreshold) {
    alerts.hypoglycemiaFrequent = {
      hasAlert: true,
      count: allHypoReadings.length,
      lastOccurrence: allHypoReadings[0].date,
      severity: 'danger'
    }
  }

  // Calculate summary
  const alertsArray = [
    alerts.hyperglycemia,
    alerts.hyperglycemiaFrequent,
    alerts.hyperglycemiaMajor,
    alerts.hypoglycemia,
    alerts.hypoglycemiaFrequent,
    alerts.hypoglycemiaMajor
  ]

  const totalAlerts = alertsArray.filter(alert => alert.hasAlert).length
  let highestSeverity: 'normal' | 'warning' | 'danger' | 'critical' = 'normal'

  if (alertsArray.some(alert => alert.severity === 'critical')) {
    highestSeverity = 'critical'
  } else if (alertsArray.some(alert => alert.severity === 'danger')) {
    highestSeverity = 'danger'
  } else if (alertsArray.some(alert => alert.severity === 'warning')) {
    highestSeverity = 'warning'
  }

  alerts.summary = { totalAlerts, highestSeverity }

  return alerts
}

export function getDetailedAlertSeverity(alerts: DetailedGlucoseAlerts): 'normal' | 'warning' | 'danger' | 'critical' {
  return alerts.summary.highestSeverity
}

// Legacy function for backward compatibility
export function analyzeGlucoseReadings(
  readings: GlucoseReading[],
  thresholds: GlucoseThresholdValues
) {
  return analyzeDetailedGlucoseReadings(readings, thresholds)
}

export function getAlertSeverity(alerts: any): 'normal' | 'warning' | 'danger' | 'critical' {
  return getDetailedAlertSeverity(alerts)
}