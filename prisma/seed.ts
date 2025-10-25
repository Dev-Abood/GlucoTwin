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

<<<<<<< HEAD
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
=======
// Generate glucose readings for a patient with specific pattern
function generateReadings(patientId: string, pattern: 'normal' | 'mild' | 'frequent' | 'critical' | 'mixed') {
  const readings: Array<{
    patientId: string
    date: Date
    time: string
    type: ReadingType
    level: number
    status: ReadingStatus
    notes: string | null
  }> = []
  const readingTypes = Object.values(ReadingType)
  const now = new Date()
  
  // Generate readings for the last 7 days with higher frequency
  for (let day = 0; day < 7; day++) {
    const date = new Date(now)
    date.setDate(date.getDate() - day)
    date.setHours(0, 0, 0, 0)
    
    const readingsPerDay = Math.floor(Math.random() * 3) + 4
    
    for (let i = 0; i < readingsPerDay; i++) {
      const type = readingTypes[Math.floor(Math.random() * readingTypes.length)]
      let level: number
      let time: string
      
      switch (type) {
        case 'BEFORE_BREAKFAST':
          time = `0${6 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
          break
        case 'AFTER_BREAKFAST':
          time = `0${8 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
          break
        case 'BEFORE_LUNCH':
          time = `${12 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
          break
        case 'AFTER_LUNCH':
          time = `${14 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
          break
        case 'BEFORE_DINNER':
          time = `${18 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
          break
        case 'AFTER_DINNER':
          time = `${20 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
          break
        default:
          time = `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
      }
      
      switch (pattern) {
        case 'normal':
          level = Math.random() < 0.9 ? 
            (type.includes('BEFORE') ? 70 + Math.random() * 20 : 90 + Math.random() * 40) :
            (type.includes('BEFORE') ? 95 + Math.random() * 10 : 140 + Math.random() * 10)
          break
          
        case 'mild':
          level = Math.random() < 0.7 ?
            (type.includes('BEFORE') ? 70 + Math.random() * 25 : 90 + Math.random() * 50) :
            (type.includes('BEFORE') ? 95 + Math.random() * 20 : 140 + Math.random() * 25)
          break
          
        case 'frequent':
          level = Math.random() < 0.4 ?
            (type.includes('BEFORE') ? 70 + Math.random() * 25 : 90 + Math.random() * 50) :
            (type.includes('BEFORE') ? 95 + Math.random() * 40 : 140 + Math.random() * 40)
          break
          
        case 'critical':
          level = Math.random() < 0.15 ?
            180 + Math.random() * 50 :
            Math.random() < 0.05 ?
            40 + Math.random() * 14 :
            (type.includes('BEFORE') ? 70 + Math.random() * 30 : 90 + Math.random() * 60)
          break
          
        case 'mixed':
          const rand = Math.random()
          if (rand < 0.1) level = 180 + Math.random() * 50
          else if (rand < 0.15) level = 40 + Math.random() * 14
          else if (rand < 0.4) level = type.includes('BEFORE') ? 95 + Math.random() * 30 : 140 + Math.random() * 30
          else level = type.includes('BEFORE') ? 70 + Math.random() * 25 : 90 + Math.random() * 50
          break
          
        default:
          level = 80 + Math.random() * 40
      }
      
      level = Math.max(30, Math.min(300, level))
      
      const readingDate = new Date(date)
      
      readings.push({
        patientId,
        date: readingDate,
        time,
        type,
        level: Math.round(level * 10) / 10,
        status: getReadingStatus(level, type),
        notes: Math.random() < 0.3 ? 
          ['Feeling good', 'After exercise', 'Forgot medication', 'Stressed today', 'Had large meal'][Math.floor(Math.random() * 5)] :
          null
      })
>>>>>>> feature/skeleton
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

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...')
  
  await prisma.recommendation.deleteMany({})
  await prisma.message.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.patientAssignment.deleteMany({})
  await prisma.reading.deleteMany({})
  await prisma.gDMPrediction.deleteMany({})
  await prisma.clinicalInformation.deleteMany({})
  await prisma.patient.deleteMany({})
  
  console.log('✅ Existing data cleared')
}

async function main() {
<<<<<<< HEAD
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
=======
  console.log('🌱 Starting database seed...')
  console.log(`📅 Current date: ${new Date().toLocaleDateString()}`)
  
  // Clear existing data first
  await clearDatabase()
  
  const patients = [
    // Normal patients (5)
    { name: 'Sarah Johnson', email: 'sarah.johnson@email.com', age: 28, term: 24, pattern: 'normal' as const, address: 'University City, Sharjah, UAE', latitude: 25.2936 + (Math.random() - 0.5) * 0.01, longitude: 55.4828 + (Math.random() - 0.5) * 0.01 },
    { name: 'Emily Chen', email: 'emily.chen@email.com', age: 32, term: 18, pattern: 'normal' as const, address: 'Al Nahda, Sharjah, UAE', latitude: 25.2950 + (Math.random() - 0.5) * 0.01, longitude: 55.4820 + (Math.random() - 0.5) * 0.01 },
    { name: 'Maria Rodriguez', email: 'maria.rodriguez@email.com', age: 26, term: 30, pattern: 'normal' as const, address: 'Muwaileh, Sharjah, UAE', latitude: 25.2940 + (Math.random() - 0.5) * 0.01, longitude: 55.4830 + (Math.random() - 0.5) * 0.01 },
    { name: 'Lisa Thompson', email: 'lisa.thompson@email.com', age: 29, term: 22, pattern: 'normal' as const, address: 'Al Nasserya, Sharjah, UAE', latitude: 25.2925 + (Math.random() - 0.5) * 0.01, longitude: 55.4840 + (Math.random() - 0.5) * 0.01 },
    { name: 'Jessica Park', email: 'jessica.park@email.com', age: 31, term: 28, pattern: 'normal' as const, address: 'Al Salam Street, Sharjah, UAE', latitude: 25.2945 + (Math.random() - 0.5) * 0.01, longitude: 55.4835 + (Math.random() - 0.5) * 0.01 },
    
    // Mild elevation patients (5)
    { name: 'Rachel Green', email: 'rachel.green@email.com', age: 30, term: 25, pattern: 'mild' as const, address: 'University City Road, Sharjah, UAE', latitude: 25.2930 + (Math.random() - 0.5) * 0.01, longitude: 55.4825 + (Math.random() - 0.5) * 0.01 },
    { name: 'Amanda Wilson', email: 'amanda.wilson@email.com', age: 27, term: 20, pattern: 'mild' as const, address: 'Al Rahmaniya, Sharjah, UAE', latitude: 25.2955 + (Math.random() - 0.5) * 0.01, longitude: 55.4815 + (Math.random() - 0.5) * 0.01 },
    { name: 'Nicole Brown', email: 'nicole.brown@email.com', age: 33, term: 26, pattern: 'mild' as const, address: 'Al Qasimia, Sharjah, UAE', latitude: 25.2920 + (Math.random() - 0.5) * 0.01, longitude: 55.4845 + (Math.random() - 0.5) * 0.01 },
    { name: 'Karen Davis', email: 'karen.davis@email.com', age: 28, term: 21, pattern: 'mild' as const, address: 'Muwaileh Commercial, Sharjah, UAE', latitude: 25.2935 + (Math.random() - 0.5) * 0.01, longitude: 55.4822 + (Math.random() - 0.5) * 0.01 },
    { name: 'Michelle Lee', email: 'michelle.lee@email.com', age: 29, term: 23, pattern: 'mild' as const, address: 'Al Tallah, Sharjah, UAE', latitude: 25.2942 + (Math.random() - 0.5) * 0.01, longitude: 55.4838 + (Math.random() - 0.5) * 0.01 },
    
    // Frequent alerts patients (5)
    { name: 'Jennifer Lopez', email: 'jennifer.lopez@email.com', age: 34, term: 27, pattern: 'frequent' as const, address: 'Al Jurf, Sharjah, UAE', latitude: 25.2960 + (Math.random() - 0.5) * 0.01, longitude: 55.4810 + (Math.random() - 0.5) * 0.01 },
    { name: 'Ashley Miller', email: 'ashley.miller@email.com', age: 26, term: 19, pattern: 'frequent' as const, address: 'Al Nouf, Sharjah, UAE', latitude: 25.2928 + (Math.random() - 0.5) * 0.01, longitude: 55.4850 + (Math.random() - 0.5) * 0.01 },
    { name: 'Stephanie Garcia', email: 'stephanie.garcia@email.com', age: 31, term: 24, pattern: 'frequent' as const, address: 'Al Azra, Sharjah, UAE', latitude: 25.2948 + (Math.random() - 0.5) * 0.01, longitude: 55.4818 + (Math.random() - 0.5) * 0.01 },
    { name: 'Melissa Anderson', email: 'melissa.anderson@email.com', age: 29, term: 22, pattern: 'frequent' as const, address: 'Al Yasmin, Sharjah, UAE', latitude: 25.2932 + (Math.random() - 0.5) * 0.01, longitude: 55.4832 + (Math.random() - 0.5) * 0.01 },
    { name: 'Christina Taylor', email: 'christina.taylor@email.com', age: 32, term: 26, pattern: 'frequent' as const, address: 'Al Majaz, Sharjah, UAE', latitude: 25.2938 + (Math.random() - 0.5) * 0.01, longitude: 55.4827 + (Math.random() - 0.5) * 0.01 },
    
    // Critical alert patients (5)
    { name: 'Samantha White', email: 'samantha.white@email.com', age: 35, term: 29, pattern: 'critical' as const, address: 'Al Salam City, Sharjah, UAE', latitude: 25.2952 + (Math.random() - 0.5) * 0.01, longitude: 55.4812 + (Math.random() - 0.5) * 0.01 },
    { name: 'Rebecca Harris', email: 'rebecca.harris@email.com', age: 33, term: 25, pattern: 'critical' as const, address: 'Al Ramtha, Sharjah, UAE', latitude: 25.2922 + (Math.random() - 0.5) * 0.01, longitude: 55.4847 + (Math.random() - 0.5) * 0.01 },
    { name: 'Laura Martin', email: 'laura.martin@email.com', age: 30, term: 21, pattern: 'critical' as const, address: 'Al Fisht, Sharjah, UAE', latitude: 25.2944 + (Math.random() - 0.5) * 0.01, longitude: 55.4820 + (Math.random() - 0.5) * 0.01 },
    { name: 'Kimberly Clark', email: 'kimberly.clark@email.com', age: 28, term: 27, pattern: 'critical' as const, address: 'Al Suyoh, Sharjah, UAE', latitude: 25.2927 + (Math.random() - 0.5) * 0.01, longitude: 55.4842 + (Math.random() - 0.5) * 0.01 },
    { name: 'Catherine Lewis', email: 'catherine.lewis@email.com', age: 34, term: 23, pattern: 'critical' as const, address: 'Al Hoshi, Sharjah, UAE', latitude: 25.2940 + (Math.random() - 0.5) * 0.01, longitude: 55.4837 + (Math.random() - 0.5) * 0.01 },
    
    // Mixed pattern patients (5)
    { name: 'Danielle Walker', email: 'danielle.walker@email.com', age: 27, term: 20, pattern: 'mixed' as const, address: 'Al Tawun, Sharjah, UAE', latitude: 25.2958 + (Math.random() - 0.5) * 0.01, longitude: 55.4808 + (Math.random() - 0.5) * 0.01 },
    { name: 'Brittany Hall', email: 'brittany.hall@email.com', age: 31, term: 24, pattern: 'mixed' as const, address: 'Al Ghubaiba, Sharjah, UAE', latitude: 25.2924 + (Math.random() - 0.5) * 0.01, longitude: 55.4849 + (Math.random() - 0.5) * 0.01 },
    { name: 'Victoria Young', email: 'victoria.young@email.com', age: 29, term: 28, pattern: 'mixed' as const, address: 'Al Taawun, Sharjah, UAE', latitude: 25.2946 + (Math.random() - 0.5) * 0.01, longitude: 55.4816 + (Math.random() - 0.5) * 0.01 },
    { name: 'Megan King', email: 'megan.king@email.com', age: 32, term: 25, pattern: 'mixed' as const, address: 'Al Wahda, Sharjah, UAE', latitude: 25.2934 + (Math.random() - 0.5) * 0.01, longitude: 55.4843 + (Math.random() - 0.5) * 0.01 },
    { name: 'Natalie Scott', email: 'natalie.scott@email.com', age: 30, term: 26, pattern: 'mixed' as const, address: 'Al Qrain, Sharjah, UAE', latitude: 25.2950 + (Math.random() - 0.5) * 0.01, longitude: 55.4814 + (Math.random() - 0.5) * 0.01 },
    
    // Additional diverse patients (5)
    { name: 'Hannah Adams', email: 'hannah.adams@email.com', age: 26, term: 18, pattern: 'normal' as const, address: 'Al Rahmaniya 1, Sharjah, UAE', latitude: 25.2962 + (Math.random() - 0.5) * 0.01, longitude: 55.4806 + (Math.random() - 0.5) * 0.01 },
    { name: 'Olivia Baker', email: 'olivia.baker@email.com', age: 33, term: 31, pattern: 'frequent' as const, address: 'Al Rahmaniya 2, Sharjah, UAE', latitude: 25.2926 + (Math.random() - 0.5) * 0.01, longitude: 55.4851 + (Math.random() - 0.5) * 0.01 },
    { name: 'Grace Turner', email: 'grace.turner@email.com', age: 29, term: 24, pattern: 'critical' as const, address: 'Al Helio, Sharjah, UAE', latitude: 25.2941 + (Math.random() - 0.5) * 0.01, longitude: 55.4829 + (Math.random() - 0.5) * 0.01 },
    { name: 'Chloe Phillips', email: 'chloe.phillips@email.com', age: 28, term: 22, pattern: 'mild' as const, address: 'Al Sharq, Sharjah, UAE', latitude: 25.2957 + (Math.random() - 0.5) * 0.01, longitude: 55.4811 + (Math.random() - 0.5) * 0.01 },
    { name: 'Zoe Campbell', email: 'zoe.campbell@email.com', age: 31, term: 27, pattern: 'mixed' as const, address: 'Al Qulayaah, Sharjah, UAE', latitude: 25.2923 + (Math.random() - 0.5) * 0.01, longitude: 55.4846 + (Math.random() - 0.5) * 0.01 }
  ]
  
  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i]
    const patientId = `P${(100000 + i).toString()}`
    const dateOfBirth = new Date()
    dateOfBirth.setFullYear(dateOfBirth.getFullYear() - patient.age)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (40 - patient.term) * 7)
    
    console.log(`Creating patient: ${patient.name}`)
    
    const createdPatient = await prisma.patient.create({
      data: {
        patientId,
        email: patient.email,
        phone: `+971${Math.floor(Math.random() * 90000000) + 10000000}`,
        name: patient.name,
        age: patient.age,
        dateOfBirth,
        term: patient.term,
        dueDate,
        latitude: patient.latitude,
        longitude: patient.longitude,
        address: patient.address
      }
    })
    
    const readings = generateReadings(createdPatient.id, patient.pattern)
    
    if (readings.length > 0) {
      console.log(`  Creating ${readings.length} readings for ${patient.name}`)
      await prisma.reading.createMany({ data: readings })
    }
    
    const clinicalInfo = await prisma.clinicalInformation.create({
      data: {
        patientId: createdPatient.id,
        nationality: 'UAE',
        bmi: 20 + Math.random() * 15,
        weight: 60 + Math.random() * 40,
        height: 150 + Math.random() * 25,
        weightGainDuringPregnancy: 5 + Math.random() * 20,
        fastingBloodGlucose: 70 + Math.random() * 30,
        oneHour75Glucose: 120 + Math.random() * 60,
        twoHour75Glucose: 100 + Math.random() * 80,
        hypertensiveDisorders: Math.random() < 0.2 ? 'Yes' : 'No',
        pulseHeartRate: 60 + Math.random() * 40,
        bpSystolic: 100 + Math.random() * 40,
        bpDiastolic: 60 + Math.random() * 30
      }
    })
    
    let riskCategory: GDMRiskLevel
    let predictedGDMRisk: number
    
    switch (patient.pattern) {
      case 'normal':
        riskCategory = Math.random() < 0.8 ? 'LOW' : 'MODERATE'
        predictedGDMRisk = Math.random() * 0.4
        break
      case 'mild':
        riskCategory = Math.random() < 0.6 ? 'MODERATE' : 'LOW'
        predictedGDMRisk = 0.2 + Math.random() * 0.4
        break
      case 'frequent':
        riskCategory = Math.random() < 0.7 ? 'HIGH' : 'MODERATE'
        predictedGDMRisk = 0.4 + Math.random() * 0.4
        break
      case 'critical':
        riskCategory = Math.random() < 0.8 ? 'CRITICAL' : 'HIGH'
        predictedGDMRisk = 0.6 + Math.random() * 0.4
        break
      case 'mixed':
        const rand = Math.random()
        if (rand < 0.25) riskCategory = 'LOW'
        else if (rand < 0.5) riskCategory = 'MODERATE'
        else if (rand < 0.75) riskCategory = 'HIGH'
        else riskCategory = 'CRITICAL'
        predictedGDMRisk = Math.random()
        break
      default:
        riskCategory = 'LOW'
        predictedGDMRisk = Math.random() * 0.3
    }
    
    await prisma.gDMPrediction.create({
      data: {
        clinicalInfoId: clinicalInfo.id,
        predictedGDMRisk,
        riskCategory,
        confidence: 0.7 + Math.random() * 0.3,
        modelVersion: 'v1.2.3',
        featuresUsed: { features: ['bmi', 'age', 'fastingBloodGlucose', 'term', 'weightGain'] },
        topInfluentialFeatures: ['fastingBloodGlucose', 'bmi', 'age', 'term', 'weightGain'],
        isActive: true
      }
    })
    
    await prisma.patientAssignment.create({
      data: {
        doctorId: DOCTOR_ID,
        patientId: createdPatient.id,
        lastVisitDate: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        addedDate: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
        hasMessageForDoctor: Math.random() < 0.3,
        hasMessageForPatient: Math.random() < 0.2
      }
    })
    
    console.log(`✅ Completed patient: ${patient.name} (${patientId})`)
  }
  
  const patientAssignments = await prisma.patientAssignment.findMany({ where: { doctorId: DOCTOR_ID } })
  
  const sampleRecommendations = [
    'Monitor blood glucose levels 4 times daily',
    'Follow a balanced diet with controlled carbohydrate intake',
    'Exercise for 30 minutes daily after meals',
    'Take prescribed medication as directed',
    'Attend weekly check-ups until delivery',
    'Monitor baby movements daily',
    'Check blood pressure twice weekly',
    'Maintain proper hydration throughout the day',
    'Get adequate sleep (7-8 hours per night)',
    'Practice stress management techniques'
  ]
  
  for (let i = 0; i < Math.min(15, patientAssignments.length); i++) {
    const assignment = patientAssignments[i]
    const numRecommendations = Math.floor(Math.random() * 3) + 1
    
    for (let j = 0; j < numRecommendations; j++) {
      const recommendation = sampleRecommendations[Math.floor(Math.random() * sampleRecommendations.length)]
      
      await prisma.recommendation.create({
        data: {
          patientAssignmentId: assignment.id,
          title: `Recommendation ${j + 1}`,
          description: recommendation,
          isActive: Math.random() < 0.9
>>>>>>> feature/skeleton
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
<<<<<<< HEAD

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
=======
  
  const existingThresholds = await prisma.glucoseThresholds.findUnique({ where: { doctorId: DOCTOR_ID } })
  
  if (!existingThresholds) {
    await prisma.glucoseThresholds.create({
      data: {
        doctorId: DOCTOR_ID,
        hyperglycemiaBeforeMeal: 95,
        hyperglycemiaAfterMeal: 140,
        hyperglycemiaMajor: 180,
        hypoglycemia: 70,
        hypoglycemiaMajor: 54,
        frequentThreshold: 3
      }
    })
    console.log('✅ Created default glucose thresholds')
  }
  
  console.log(`🎉 Seeding completed successfully!`)
  console.log(`📊 Created ${patients.length} patients with diverse glucose reading patterns`)
  console.log(`🔬 Generated recent glucose readings (last 7 days, 4-6 readings per day)`)
  console.log(`👨‍⚕️ All patients assigned to doctor: ${DOCTOR_ID}`)
  console.log(`📍 All patients located around University of Sharjah area`)
>>>>>>> feature/skeleton
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Failed to seed last-week readings:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
