// prisma/seed.ts
import { PrismaClient, ReadingStatus, ReadingType, NotificationType } from '@prisma/client'
import { addDays, subDays, setHours, setMinutes, setSeconds } from 'date-fns'

const prisma = new PrismaClient()

const DOCTOR_ID = process.env.DOCTOR_ID || 'user_356w0ytWQ7zWPtbwhAtR5WfciSj'

function d(h: number, m = 0) {
  const now = new Date()
  const t = setSeconds(setMinutes(setHours(now, h), m), 0)
  return t
}

async function main() {
  const doctor = await prisma.doctor.findUnique({
    where: { id: DOCTOR_ID },
    include: { hospital: true, glucoseThresholds: true },
  })
  if (!doctor) throw new Error('Doctor not found. Set DOCTOR_ID to a valid Doctor.id.')

  const hospitalId = doctor.hospitalId

  const patientsData = Array.from({ length: 10 }).map((_, i) => {
    const idx = i + 1
    const age = 25 + (i % 8)
    const dob = subDays(new Date(), age * 365)
    const term = 20 + (i % 10)
    const due = addDays(new Date(), (40 - term) * 7)
    return {
      patientId: `P-${String(idx).padStart(3, '0')}`,
      email: `patient${idx}@demo.local`,
      phone: `+9715${Math.floor(10000000 + Math.random() * 89999999)}`,
      name: `Patient ${idx}`,
      age,
      dateOfBirth: dob,
      term,
      dueDate: due,
      hospitalId,
      latitude: 25.2956 + Math.random() * 0.01,
      longitude: 55.4624 + Math.random() * 0.01,
      address: 'Sharjah, UAE',
    }
  })

  const createdPatients = await prisma.$transaction(
    patientsData.map((p) => prisma.patient.create({ data: p }))
  )

  const assignments = await prisma.$transaction(
    createdPatients.map((p) =>
      prisma.patientAssignment.create({
        data: {
          doctorId: doctor.id,
          patientId: p.id,
          lastVisitDate: subDays(new Date(), 7),
          addedDate: new Date(),
        },
      })
    )
  )

function S(level: number, type: ReadingType): ReadingStatus {
  const beforeMealTypes: ReadingType[] = [
    ReadingType.BEFORE_BREAKFAST,
    ReadingType.BEFORE_LUNCH,
    ReadingType.BEFORE_DINNER,
  ]
  const before = beforeMealTypes.includes(type)

  if (before) {
    if (level < 95) return ReadingStatus.NORMAL
    if (level < 105) return ReadingStatus.ELEVATED
    return ReadingStatus.HIGH
  } else {
    if (level < 140) return ReadingStatus.NORMAL
    if (level < 160) return ReadingStatus.ELEVATED
    return ReadingStatus.HIGH
  }
}


  function R(patientId: string, dayOffset: number, type: ReadingType, level: number, timeStr: string, notes?: string) {
    const date = subDays(new Date(), dayOffset)
    return {
      patientId,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      time: timeStr,
      type,
      level,
      status: S(level, type),
      notes,
    }
  }

  const T = {
    BB: ReadingType.BEFORE_BREAKFAST,
    AB: ReadingType.AFTER_BREAKFAST,
    BL: ReadingType.BEFORE_LUNCH,
    AL: ReadingType.AFTER_LUNCH,
    BD: ReadingType.BEFORE_DINNER,
    AD: ReadingType.AFTER_DINNER,
  }

  const scenarios = [
    // 1) Mostly normal — no alerts
    (p: string) => [
      R(p, 0, T.BB, 90, '08:00'),
      R(p, 0, T.AB, 130, '10:00'),
      R(p, 1, T.BL, 92, '12:30'),
      R(p, 1, T.AL, 135, '14:30'),
      R(p, 2, T.BD, 93, '19:00'),
      R(p, 2, T.AD, 138, '21:00'),
    ],
    // 2) Single Hyperglycaemia Major (>=180)
    (p: string) => [
      R(p, 0, T.AB, 185, '10:00', 'Major high'),
      R(p, 1, T.BB, 94, '08:00'),
      R(p, 2, T.AL, 145, '14:30'),
    ],
    // 3) Single Hypoglycaemia Major (<=54)
    (p: string) => [
      R(p, 0, T.BL, 50, '12:30', 'Major low'),
      R(p, 1, T.AB, 120, '10:00'),
      R(p, 2, T.AD, 130, '21:00'),
    ],
    // 4) Frequent Hyperglycaemia (3+ elevated in 7 days, before>=95 or after>=140)
    (p: string) => [
      R(p, 0, T.BB, 100, '08:00', 'elevated before'),
      R(p, 2, T.AB, 150, '10:00', 'elevated after'),
      R(p, 4, T.AL, 155, '14:30', 'elevated after'),
      R(p, 6, T.BD, 102, '19:00', 'elevated before'),
    ],
    // 5) Frequent Hypoglycaemia (3+ lows <=70)
    (p: string) => [
      R(p, 0, T.AD, 68, '21:00', 'low'),
      R(p, 2, T.BB, 65, '08:00', 'low'),
      R(p, 4, T.AL, 70, '14:30', 'low'),
      R(p, 6, T.BD, 95, '19:00'),
    ],
    // 6) Repeated high after meals (>=160) -> frequent hyper + high status
    (p: string) => [
      R(p, 0, T.AB, 165, '10:00'),
      R(p, 1, T.AL, 170, '14:30'),
      R(p, 3, T.AD, 162, '21:00'),
      R(p, 5, T.AB, 158, '10:00'), // elevated, still counts for frequent if >=140
    ],
    // 7) Elevated-only (no frequent: only 2 qualifying)
    (p: string) => [
      R(p, 0, T.BB, 100, '08:00', 'elevated before'),
      R(p, 3, T.AB, 145, '10:00', 'elevated after'),
      R(p, 6, T.BL, 90, '12:30'),
    ],
    // 8) Another Hyperglycaemia Major spike
    (p: string) => [
      R(p, 0, T.AB, 200, '10:00', 'Major high'),
      R(p, 1, T.BB, 96, '08:00'),
      R(p, 2, T.AL, 150, '14:30'),
    ],
    // 9) Mixed moderate highs before meals (status HIGH but under 180)
    (p: string) => [
      R(p, 0, T.BB, 112, '08:00'),
      R(p, 2, T.BL, 110, '12:30'),
      R(p, 4, T.BD, 109, '19:00'),
    ],
    // 10) Nocturnal-ish single hypo (non-major)
    (p: string) => [
      R(p, 0, T.BD, 69, '19:00', 'low'),
      R(p, 1, T.AB, 130, '10:00'),
      R(p, 2, T.AL, 135, '14:30'),
    ],
  ]

  const allReadings: any[] = []
  createdPatients.forEach((p, i) => {
    const gen = scenarios[i % scenarios.length]
    allReadings.push(...gen(p.id))
  })

  const insertedReadings = await prisma.$transaction(
    allReadings.map((rd) => prisma.reading.create({ data: rd }))
  )

  const notificationsData = []
  for (const rd of insertedReadings) {
    const isMajorHigh = rd.level >= 180
    const isMajorLow = rd.level <= 54
    if (isMajorHigh || isMajorLow) {
      notificationsData.push({
        type: NotificationType.DANGEROUS_READING,
        title: isMajorHigh ? 'Hyperglycaemia Major' : 'Hypoglycaemia Major',
        content: isMajorHigh
          ? `Reading ${rd.level} mg/dL at ${rd.time} indicates major hyperglycaemia.`
          : `Reading ${rd.level} mg/dL at ${rd.time} indicates major hypoglycaemia.`,
        metadata: { readingId: rd.id, readingType: rd.type, level: rd.level },
        patientId: rd.patientId,
        doctorId: doctor.id,
      })
    }
  }

  if (notificationsData.length) {
    await prisma.$transaction(
      notificationsData.map((n) => prisma.notification.create({ data: n }))
    )
  }

  console.log(`Seeded ${createdPatients.length} patients, ${assignments.length} assignments, ${insertedReadings.length} readings, ${notificationsData.length} notifications.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
