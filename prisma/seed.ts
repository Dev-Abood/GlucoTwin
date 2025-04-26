// prisma/seed.ts

import { PrismaClient, ReadingType } from '@prisma/client'
import { randomUUID }      from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const patientId = 'user_2w5sJq9yXMRMCs7WcJ8Z5alaTNx'

  // 1. Cleanup: remove any existing readings for this patient only
  const deleted = await prisma.reading.deleteMany({
    where: { patientId }
  })
  console.log(`Deleted ${deleted.count} old readings for patient ${patientId}`)

  // 2. Prepare seed data: six readings per day for the last 7 days,
  //    with a small chance to skip some so you'll get nulls in the UI
  const today = new Date()
  const readings: Array<{
    id: string
    patientId: string
    date: Date
    time: string
    type: ReadingType
    level: number
    notes: string | null
  }> = []

  const readingTemplates = [
    { type: ReadingType.BEFORE_BREAKFAST, time: '07:00', min: 80,  max: 100, notes: 'Felt lightheaded'   },
    { type: ReadingType.AFTER_BREAKFAST,  time: '09:00', min: 120, max: 140, notes: 'Ate extra carbs'    },
    { type: ReadingType.BEFORE_LUNCH,     time: '12:00', min: 90,  max: 110, notes: 'Skipped breakfast' },
    { type: ReadingType.AFTER_LUNCH,      time: '14:00', min: 130, max: 150, notes: 'Had office snack'  },
    { type: ReadingType.BEFORE_DINNER,    time: '18:00', min: 95,  max: 115, notes: 'Busy schedule'     },
    { type: ReadingType.AFTER_DINNER,     time: '20:00', min: 140, max: 160, notes: null             },
  ]

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today)
    date.setDate(today.getDate() - dayOffset)
    date.setHours(0, 0, 0, 0)

    for (const tpl of readingTemplates) {
      // randomly skip ~20% of non-forced readings to create null slots
      const isForcedHigh = tpl.type === ReadingType.AFTER_DINNER && dayOffset === 3
      if (!isForcedHigh && Math.random() < 0.2) {
        continue
      }

      let level = Math.floor(Math.random() * (tpl.max - tpl.min + 1)) + tpl.min
      let note  = tpl.notes

      // Force a high reading 3 days ago after dinner
      if (isForcedHigh) {
        level = 185
        note  = 'High reading — consult your doctor'
      }

      readings.push({
        id:        randomUUID(),
        patientId,
        date,
        time:      tpl.time,
        type:      tpl.type,
        level,
        notes:     note,
      })
    }
  }

  // 3. Insert new readings
  const result = await prisma.reading.createMany({
    data:           readings,
    skipDuplicates: true,
  })
  console.log(`Seeded ${result.count} readings for patient ${patientId}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })