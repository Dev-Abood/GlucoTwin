import { PrismaClient, ReadingType, ReadingStatus, GDMRiskLevel } from '@prisma/client'

const prisma = new PrismaClient()

// === CONFIG ===
const DOCTOR_ID = 'user_32WLZ1evBqltyr1zaYZB142VoGK'
const DAYS_BACK = 7                           // last week (inclusive of today)
const MIN_READINGS_PER_DAY = 8               // crank this up/down if you want
const MAX_READINGS_PER_DAY = 14

// Times (HH:mm) used to pick a matching ReadingType (before/after meals)
const SCHEDULE_SLOTS = [
  { hh:  7, mm: 30, type: ReadingType.BEFORE_BREAKFAST },
  { hh:  9, mm:  0, type: ReadingType.AFTER_BREAKFAST  },
  { hh: 12, mm: 30, type: ReadingType.BEFORE_LUNCH     },
  { hh: 14, mm:  0, type: ReadingType.AFTER_LUNCH      },
  { hh: 18, mm: 30, type: ReadingType.BEFORE_DINNER    },
  { hh: 20, mm: 30, type: ReadingType.AFTER_DINNER     },
]

// fallback thresholds if doctor has none
const DEFAULT_THRESHOLDS = {
  hyperglycemiaBeforeMeal: 95,
  hyperglycemiaAfterMeal: 140,
  hyperglycemiaMajor: 180,
  hypoglycemia: 70,
  hypoglycemiaMajor: 54,
}

type Thresholds = typeof DEFAULT_THRESHOLDS

function pad2(n: number) { return n.toString().padStart(2, '0') }
function toTimeStr(h: number, m: number) { return `${pad2(h)}:${pad2(m)}` }

// Status using thresholds
function getStatus(level: number, type: ReadingType, t: Thresholds): ReadingStatus {
  const isBefore = (
    type === ReadingType.BEFORE_BREAKFAST ||
    type === ReadingType.BEFORE_LUNCH ||
    type === ReadingType.BEFORE_DINNER
  )
  const limit = isBefore ? t.hyperglycemiaBeforeMeal : t.hyperglycemiaAfterMeal
  if (level <= limit) return ReadingStatus.NORMAL
  if (level <= (isBefore ? limit + 20 : limit + 20)) return ReadingStatus.ELEVATED
  return ReadingStatus.HIGH
}

// Map latest risk → generation “pattern”
function riskToPattern(risk: GDMRiskLevel | null) {
  switch (risk) {
    case 'LOW': return 'normal'
    case 'MODERATE': return 'mild'
    case 'HIGH': return 'frequent'
    case 'CRITICAL': return 'critical'
    default: return 'mixed'
  }
}

// Level generator shaped by pattern & type (keeps your original flavor)
function sampleLevel(pattern: 'normal' | 'mild' | 'frequent' | 'critical' | 'mixed', type: ReadingType): number {
  const isBefore = (
    type === ReadingType.BEFORE_BREAKFAST ||
    type === ReadingType.BEFORE_LUNCH ||
    type === ReadingType.BEFORE_DINNER
  )

  let level: number
  switch (pattern) {
    case 'normal':
      level = Math.random() < 0.9
        ? (isBefore ? (70 + Math.random() * 20) : (90 + Math.random() * 40))
        : (isBefore ? (95 + Math.random() * 10) : (140 + Math.random() * 10))
      break
    case 'mild':
      level = Math.random() < 0.7
        ? (isBefore ? (70 + Math.random() * 25) : (90 + Math.random() * 50))
        : (isBefore ? (95 + Math.random() * 20) : (140 + Math.random() * 25))
      break
    case 'frequent':
      level = Math.random() < 0.4
        ? (isBefore ? (70 + Math.random() * 25) : (90 + Math.random() * 50))
        : (isBefore ? (95 + Math.random() * 40) : (140 + Math.random() * 40))
      break
    case 'critical': {
      // higher chance of severe highs/lows
      const r = Math.random()
      if (r < 0.20) level = 180 + Math.random() * 60      // very high
      else if (r < 0.27) level = 40 + Math.random() * 14  // very low
      else level = isBefore ? (70 + Math.random() * 35) : (90 + Math.random() * 70)
      break
    }
    case 'mixed':
    default: {
      const r = Math.random()
      if (r < 0.10) level = 180 + Math.random() * 50
      else if (r < 0.15) level = 40 + Math.random() * 14
      else if (r < 0.40) level = isBefore ? (95 + Math.random() * 30) : (140 + Math.random() * 30)
      else level = isBefore ? (70 + Math.random() * 25) : (90 + Math.random() * 50)
      break
    }
  }

  // Clamp and round
  level = Math.max(30, Math.min(350, level))
  return Math.round(level * 10) / 10
}

// Pick a time + type; also add slight random jitter to minutes
function pickSlot(i: number, total: number): { hh: number, mm: number, type: ReadingType } {
  // Try to spread across our 6 canonical slots; if more than 6 in a day,
  // we’ll reuse slots and add random jitter.
  const base = SCHEDULE_SLOTS[i % SCHEDULE_SLOTS.length]
  const jitter = Math.floor((Math.random() - 0.5) * 20) // ±20 minutes
  let mm = base.mm + jitter
  let hh = base.hh
  if (mm < 0) { mm += 60; hh = Math.max(0, hh - 1) }
  if (mm >= 60) { mm -= 60; hh = Math.min(23, hh + 1) }
  return { hh, mm, type: base.type }
}

// Random note sometimes
function maybeNote(): string | null {
  if (Math.random() < 0.25) {
    const pick = [
      'After exercise', 'Large meal', 'Felt dizzy',
      'Missed snack', 'Stressful day', 'New medication', 'Poor sleep'
    ]
    return pick[Math.floor(Math.random() * pick.length)]
  }
  return null
}

// Chunk array to avoid parameter explosion in createMany (Postgres limit)
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function getDoctorThresholds(doctorId: string): Promise<Thresholds> {
  const t = await prisma.glucoseThresholds.findUnique({ where: { doctorId } })
  if (!t) return DEFAULT_THRESHOLDS
  return {
    hyperglycemiaBeforeMeal: t.hyperglycemiaBeforeMeal,
    hyperglycemiaAfterMeal: t.hyperglycemiaAfterMeal,
    hyperglycemiaMajor: t.hyperglycemiaMajor,
    hypoglycemia: t.hypoglycemia,
    hypoglycemiaMajor: t.hypoglycemiaMajor,
  }
}

async function main() {
  console.log('🩸 Seeding dense last-week readings for all patients assigned to your doctor…')

  // 1) Get all patient assignments for this doctor (and their patients)
  const assignments = await prisma.patientAssignment.findMany({
    where: { doctorId: DOCTOR_ID },
    select: { patientId: true }
  })
  if (assignments.length === 0) {
    console.log('No patients assigned to this doctor. Exiting.')
    return
  }

  const patientIds = assignments.map(a => a.patientId)

  // Fetch patients & their latest GDM prediction (to shape patterns)
  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds } },
    select: {
      id: true,
      clinicalInfo: {
        select: {
          id: true,
          aiPredictions: {
            where: { isActive: true },
            orderBy: { predictedAt: 'desc' },
            take: 1,
            select: { riskCategory: true }
          }
        }
      }
    }
  })

  // Thresholds
  const thresholds = await getDoctorThresholds(DOCTOR_ID)

  // 2) Build readings
  const now = new Date()
  const allReadings: Array<{
    patientId: string
    date: Date
    time: string
    type: ReadingType
    level: number
    status: ReadingStatus
    notes?: string | null
  }> = []

  for (const p of patients) {
    const latestRisk = p.clinicalInfo?.aiPredictions?.[0]?.riskCategory ?? null
    const pattern = riskToPattern(latestRisk)

    for (let d = 0; d < DAYS_BACK; d++) {
      const dayDate = new Date(now)
      dayDate.setHours(0, 0, 0, 0)
      dayDate.setDate(dayDate.getDate() - d)

      const countToday = Math.floor(Math.random() * (MAX_READINGS_PER_DAY - MIN_READINGS_PER_DAY + 1)) + MIN_READINGS_PER_DAY

      for (let i = 0; i < countToday; i++) {
        const { hh, mm, type } = pickSlot(i, countToday)

        // Compose timestamp fields
        const readingDate = new Date(dayDate)
        readingDate.setHours(hh, mm, Math.floor(Math.random() * 50), 0)

        const level = sampleLevel(pattern as any, type)
        const status = getStatus(level, type, thresholds)

        allReadings.push({
          patientId: p.id,
          date: readingDate,              // your schema stores the date/time stamp here
          time: toTimeStr(hh, mm),        // and also as a string (kept for your UI)
          type,
          level,
          status,
          notes: maybeNote()
        })
      }
    }
  }

  console.log(`Prepared ${allReadings.length} readings for ${patients.length} patients.`)

  // 3) Persist in chunks (avoid hitting parameter limits)
  const chunks = chunk(allReadings, 1000)
  let total = 0
  for (let idx = 0; idx < chunks.length; idx++) {
    const batch = chunks[idx]
    const res = await prisma.reading.createMany({ data: batch, skipDuplicates: true })
    total += res.count
    console.log(`  • Batch ${idx + 1}/${chunks.length}: inserted ${res.count}`)
  }

  console.log('✅ Done.')
  console.log(`📊 Inserted ${total} reading rows across the last ${DAYS_BACK} days.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Failed to seed last-week readings:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
