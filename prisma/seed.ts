import { PrismaClient, ReadingType, ReadingStatus, GDMRiskLevel } from '@prisma/client'

const prisma = new PrismaClient()

// Your doctor ID from the database
const DOCTOR_ID = 'user_32WLZ1evBqltyr1zaYZB142VoGK'

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Helper function to generate reading status based on level and type
function getReadingStatus(level: number, type: ReadingType): ReadingStatus {
  const isBeforeMeal = ['BEFORE_BREAKFAST', 'BEFORE_LUNCH', 'BEFORE_DINNER'].includes(type)
  
  if (isBeforeMeal) {
    if (level <= 95) return 'NORMAL'
    if (level <= 105) return 'ELEVATED'
    return 'HIGH'
  } else {
    if (level <= 140) return 'NORMAL'
    if (level <= 160) return 'ELEVATED'
    return 'HIGH'
  }
}

// Generate glucose readings for a patient with specific pattern
function generateReadings(patientId: string, pattern: 'normal' | 'mild' | 'frequent' | 'critical' | 'mixed'): any[] {
  const readings: any[] = []
  const readingTypes = Object.values(ReadingType)
  const now = new Date()
  
  // Generate readings for the last 14 days
  for (let day = 0; day < 14; day++) {
    const date = new Date(now)
    date.setDate(date.getDate() - day)
    
    // Randomly decide how many readings per day (2-6)
    const readingsPerDay = Math.floor(Math.random() * 5) + 2
    
    for (let i = 0; i < readingsPerDay; i++) {
      const type = readingTypes[Math.floor(Math.random() * readingTypes.length)]
      let level: number
      
      switch (pattern) {
        case 'normal':
          // Mostly normal readings
          level = Math.random() < 0.9 ? 
            (type.includes('BEFORE') ? 70 + Math.random() * 20 : 90 + Math.random() * 40) :
            (type.includes('BEFORE') ? 95 + Math.random() * 10 : 140 + Math.random() * 10)
          break
          
        case 'mild':
          // Some elevated readings, no critical
          level = Math.random() < 0.7 ?
            (type.includes('BEFORE') ? 70 + Math.random() * 25 : 90 + Math.random() * 50) :
            (type.includes('BEFORE') ? 95 + Math.random() * 20 : 140 + Math.random() * 25)
          break
          
        case 'frequent':
          // Frequent elevated readings to trigger frequent alerts
          level = Math.random() < 0.4 ?
            (type.includes('BEFORE') ? 70 + Math.random() * 25 : 90 + Math.random() * 50) :
            (type.includes('BEFORE') ? 95 + Math.random() * 40 : 140 + Math.random() * 40)
          break
          
        case 'critical':
          // Include some critical readings
          level = Math.random() < 0.15 ?
            180 + Math.random() * 50 : // Critical high
            Math.random() < 0.05 ?
            40 + Math.random() * 14 : // Critical low
            (type.includes('BEFORE') ? 70 + Math.random() * 30 : 90 + Math.random() * 60)
          break
          
        case 'mixed':
          // Mix of everything
          const rand = Math.random()
          if (rand < 0.1) level = 180 + Math.random() * 50 // Critical high
          else if (rand < 0.15) level = 40 + Math.random() * 14 // Critical low
          else if (rand < 0.4) level = type.includes('BEFORE') ? 95 + Math.random() * 30 : 140 + Math.random() * 30
          else level = type.includes('BEFORE') ? 70 + Math.random() * 25 : 90 + Math.random() * 50
          break
          
        default:
          level = 80 + Math.random() * 40
      }
      
      // Ensure level is within reasonable bounds
      level = Math.max(30, Math.min(300, level))
      
      readings.push({
        patientId,
        date,
        time: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        type,
        level: Math.round(level * 10) / 10, // Round to 1 decimal
        status: getReadingStatus(level, type),
        notes: Math.random() < 0.3 ? 
          ['Feeling good', 'After exercise', 'Forgot medication', 'Stressed today', 'Had large meal'][Math.floor(Math.random() * 5)] :
          null
      })
    }
  }
  
  return readings
}

async function main() {
  console.log('🌱 Starting database seed...')
  
  // Create patients with different reading patterns
  const patients = [
    // Normal patients (5)
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      age: 28,
      term: 24,
      pattern: 'normal' as const,
      address: 'University City, Sharjah, UAE',
      latitude: 25.2936 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4828 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Emily Chen',
      email: 'emily.chen@email.com',
      age: 32,
      term: 18,
      pattern: 'normal' as const,
      address: 'Al Nahda, Sharjah, UAE',
      latitude: 25.2950 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4820 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Maria Rodriguez',
      email: 'maria.rodriguez@email.com',
      age: 26,
      term: 30,
      pattern: 'normal' as const,
      address: 'Muwaileh, Sharjah, UAE',
      latitude: 25.2940 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4830 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Lisa Thompson',
      email: 'lisa.thompson@email.com',
      age: 29,
      term: 22,
      pattern: 'normal' as const,
      address: 'Al Nasserya, Sharjah, UAE',
      latitude: 25.2925 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4840 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Jessica Park',
      email: 'jessica.park@email.com',
      age: 31,
      term: 28,
      pattern: 'normal' as const,
      address: 'Al Salam Street, Sharjah, UAE',
      latitude: 25.2945 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4835 + (Math.random() - 0.5) * 0.01
    },
    
    // Mild elevation patients (5)
    {
      name: 'Rachel Green',
      email: 'rachel.green@email.com',
      age: 30,
      term: 25,
      pattern: 'mild' as const,
      address: 'University City Road, Sharjah, UAE',
      latitude: 25.2930 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4825 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Amanda Wilson',
      email: 'amanda.wilson@email.com',
      age: 27,
      term: 20,
      pattern: 'mild' as const,
      address: 'Al Rahmaniya, Sharjah, UAE',
      latitude: 25.2955 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4815 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Nicole Brown',
      email: 'nicole.brown@email.com',
      age: 33,
      term: 26,
      pattern: 'mild' as const,
      address: 'Al Qasimia, Sharjah, UAE',
      latitude: 25.2920 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4845 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Karen Davis',
      email: 'karen.davis@email.com',
      age: 28,
      term: 21,
      pattern: 'mild' as const,
      address: 'Muwaileh Commercial, Sharjah, UAE',
      latitude: 25.2935 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4822 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Michelle Lee',
      email: 'michelle.lee@email.com',
      age: 29,
      term: 23,
      pattern: 'mild' as const,
      address: 'Al Tallah, Sharjah, UAE',
      latitude: 25.2942 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4838 + (Math.random() - 0.5) * 0.01
    },
    
    // Frequent alerts patients (5)
    {
      name: 'Jennifer Lopez',
      email: 'jennifer.lopez@email.com',
      age: 34,
      term: 27,
      pattern: 'frequent' as const,
      address: 'Al Jurf, Sharjah, UAE',
      latitude: 25.2960 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4810 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Ashley Miller',
      email: 'ashley.miller@email.com',
      age: 26,
      term: 19,
      pattern: 'frequent' as const,
      address: 'Al Nouf, Sharjah, UAE',
      latitude: 25.2928 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4850 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Stephanie Garcia',
      email: 'stephanie.garcia@email.com',
      age: 31,
      term: 24,
      pattern: 'frequent' as const,
      address: 'Al Azra, Sharjah, UAE',
      latitude: 25.2948 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4818 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Melissa Anderson',
      email: 'melissa.anderson@email.com',
      age: 29,
      term: 22,
      pattern: 'frequent' as const,
      address: 'Al Yasmin, Sharjah, UAE',
      latitude: 25.2932 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4832 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Christina Taylor',
      email: 'christina.taylor@email.com',
      age: 32,
      term: 26,
      pattern: 'frequent' as const,
      address: 'Al Majaz, Sharjah, UAE',
      latitude: 25.2938 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4827 + (Math.random() - 0.5) * 0.01
    },
    
    // Critical alert patients (5)
    {
      name: 'Samantha White',
      email: 'samantha.white@email.com',
      age: 35,
      term: 29,
      pattern: 'critical' as const,
      address: 'Al Salam City, Sharjah, UAE',
      latitude: 25.2952 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4812 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Rebecca Harris',
      email: 'rebecca.harris@email.com',
      age: 33,
      term: 25,
      pattern: 'critical' as const,
      address: 'Al Ramtha, Sharjah, UAE',
      latitude: 25.2922 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4847 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Laura Martin',
      email: 'laura.martin@email.com',
      age: 30,
      term: 21,
      pattern: 'critical' as const,
      address: 'Al Fisht, Sharjah, UAE',
      latitude: 25.2944 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4820 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Kimberly Clark',
      email: 'kimberly.clark@email.com',
      age: 28,
      term: 27,
      pattern: 'critical' as const,
      address: 'Al Suyoh, Sharjah, UAE',
      latitude: 25.2927 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4842 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Catherine Lewis',
      email: 'catherine.lewis@email.com',
      age: 34,
      term: 23,
      pattern: 'critical' as const,
      address: 'Al Hoshi, Sharjah, UAE',
      latitude: 25.2940 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4837 + (Math.random() - 0.5) * 0.01
    },
    
    // Mixed pattern patients (5)
    {
      name: 'Danielle Walker',
      email: 'danielle.walker@email.com',
      age: 27,
      term: 20,
      pattern: 'mixed' as const,
      address: 'Al Tawun, Sharjah, UAE',
      latitude: 25.2958 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4808 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Brittany Hall',
      email: 'brittany.hall@email.com',
      age: 31,
      term: 24,
      pattern: 'mixed' as const,
      address: 'Al Ghubaiba, Sharjah, UAE',
      latitude: 25.2924 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4849 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Victoria Young',
      email: 'victoria.young@email.com',
      age: 29,
      term: 28,
      pattern: 'mixed' as const,
      address: 'Al Taawun, Sharjah, UAE',
      latitude: 25.2946 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4816 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Megan King',
      email: 'megan.king@email.com',
      age: 32,
      term: 25,
      pattern: 'mixed' as const,
      address: 'Al Wahda, Sharjah, UAE',
      latitude: 25.2934 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4843 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Natalie Scott',
      email: 'natalie.scott@email.com',
      age: 30,
      term: 26,
      pattern: 'mixed' as const,
      address: 'Al Qrain, Sharjah, UAE',
      latitude: 25.2950 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4814 + (Math.random() - 0.5) * 0.01
    },
    
    // Additional diverse patients (5 more)
    {
      name: 'Hannah Adams',
      email: 'hannah.adams@email.com',
      age: 26,
      term: 18,
      pattern: 'normal' as const,
      address: 'Al Rahmaniya 1, Sharjah, UAE',
      latitude: 25.2962 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4806 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Olivia Baker',
      email: 'olivia.baker@email.com',
      age: 33,
      term: 31,
      pattern: 'frequent' as const,
      address: 'Al Rahmaniya 2, Sharjah, UAE',
      latitude: 25.2926 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4851 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Grace Turner',
      email: 'grace.turner@email.com',
      age: 29,
      term: 24,
      pattern: 'critical' as const,
      address: 'Al Helio, Sharjah, UAE',
      latitude: 25.2941 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4829 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Chloe Phillips',
      email: 'chloe.phillips@email.com',
      age: 28,
      term: 22,
      pattern: 'mild' as const,
      address: 'Al Sharq, Sharjah, UAE',
      latitude: 25.2957 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4811 + (Math.random() - 0.5) * 0.01
    },
    {
      name: 'Zoe Campbell',
      email: 'zoe.campbell@email.com',
      age: 31,
      term: 27,
      pattern: 'mixed' as const,
      address: 'Al Qulayaah, Sharjah, UAE',
      latitude: 25.2923 + (Math.random() - 0.5) * 0.01,
      longitude: 55.4846 + (Math.random() - 0.5) * 0.01
    }
  ]
  
  // Generate patient IDs
  const patientIds: string[] = []
  
  // Create patients and collect their IDs
  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i]
    const patientId = `P${(100000 + i).toString()}`
    const dateOfBirth = new Date()
    dateOfBirth.setFullYear(dateOfBirth.getFullYear() - patient.age)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (40 - patient.term) * 7) // Calculate due date based on current term
    
    console.log(`Creating patient: ${patient.name}`)
    
    const createdPatient = await prisma.patient.create({
      data: {
        patientId,
        email: patient.email,
        phone: `+971${Math.floor(Math.random() * 90000000) + 10000000}`, // UAE phone numbers
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
    
    patientIds.push(createdPatient.id)
    
    // Generate readings for this patient
    const readings = generateReadings(createdPatient.id, patient.pattern)
    
    if (readings.length > 0) {
      console.log(`  Creating ${readings.length} readings for ${patient.name}`)
      await prisma.reading.createMany({
        data: readings
      })
    }
    
    // Create clinical information with random data
    const clinicalInfo = await prisma.clinicalInformation.create({
      data: {
        patientId: createdPatient.id,
        nationality: 'UAE',
        bmi: 20 + Math.random() * 15, // BMI between 20-35
        weight: 60 + Math.random() * 40, // Weight between 60-100kg
        height: 150 + Math.random() * 25, // Height between 150-175cm
        weightGainDuringPregnancy: 5 + Math.random() * 20, // Weight gain 5-25kg
        fastingBloodGlucose: 70 + Math.random() * 30, // FBG 70-100
        oneHour75Glucose: 120 + Math.random() * 60, // 1hr glucose 120-180
        twoHour75Glucose: 100 + Math.random() * 80, // 2hr glucose 100-180
        hypertensiveDisorders: Math.random() < 0.2 ? 'Yes' : 'No', // 20% have hypertensive disorders
        pulseHeartRate: 60 + Math.random() * 40, // Heart rate 60-100
        bpSystolic: 100 + Math.random() * 40, // Systolic BP 100-140
        bpDiastolic: 60 + Math.random() * 30 // Diastolic BP 60-90
      }
    })
    
    // Create AI prediction based on patient pattern
    let riskCategory: GDMRiskLevel
    let predictedGDMRisk: number
    
    switch (patient.pattern) {
      case 'normal':
        riskCategory = Math.random() < 0.8 ? 'LOW' : 'MODERATE'
        predictedGDMRisk = Math.random() * 0.4 // 0.0-0.4
        break
      case 'mild':
        riskCategory = Math.random() < 0.6 ? 'MODERATE' : 'LOW'
        predictedGDMRisk = 0.2 + Math.random() * 0.4 // 0.2-0.6
        break
      case 'frequent':
        riskCategory = Math.random() < 0.7 ? 'HIGH' : 'MODERATE'
        predictedGDMRisk = 0.4 + Math.random() * 0.4 // 0.4-0.8
        break
      case 'critical':
        riskCategory = Math.random() < 0.8 ? 'CRITICAL' : 'HIGH'
        predictedGDMRisk = 0.6 + Math.random() * 0.4 // 0.6-1.0
        break
      case 'mixed':
        const rand = Math.random()
        if (rand < 0.25) riskCategory = 'LOW'
        else if (rand < 0.5) riskCategory = 'MODERATE'
        else if (rand < 0.75) riskCategory = 'HIGH'
        else riskCategory = 'CRITICAL'
        predictedGDMRisk = Math.random() // 0.0-1.0
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
        confidence: 0.7 + Math.random() * 0.3, // Confidence 70-100%
        modelVersion: 'v1.2.3',
        featuresUsed: {
          features: ['bmi', 'age', 'fastingBloodGlucose', 'term', 'weightGain']
        },
        topInfluentialFeatures: ['fastingBloodGlucose', 'bmi', 'age', 'term', 'weightGain'],
        isActive: true
      }
    })
    
    // Create patient assignment to your doctor account
    await prisma.patientAssignment.create({
      data: {
        doctorId: DOCTOR_ID,
        patientId: createdPatient.id,
        lastVisitDate: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()), // Last 30 days
        addedDate: randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date()), // Last 60 days
        hasMessageForDoctor: Math.random() < 0.3, // 30% have messages
        hasMessageForPatient: Math.random() < 0.2 // 20% have messages
      }
    })
    
    console.log(`✅ Completed patient: ${patient.name} (${patientId})`)
  }
  
  // Create some sample recommendations for random patients
  const patientAssignments = await prisma.patientAssignment.findMany({
    where: { doctorId: DOCTOR_ID }
  })
  
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
    const numRecommendations = Math.floor(Math.random() * 3) + 1 // 1-3 recommendations per patient
    
    for (let j = 0; j < numRecommendations; j++) {
      const recommendation = sampleRecommendations[Math.floor(Math.random() * sampleRecommendations.length)]
      
      await prisma.recommendation.create({
        data: {
          patientAssignmentId: assignment.id,
          title: `Recommendation ${j + 1}`,
          description: recommendation,
          isActive: Math.random() < 0.9 // 90% are active
        }
      })
    }
  }
  
  // Create default glucose thresholds for the doctor if they don't exist
  const existingThresholds = await prisma.glucoseThresholds.findUnique({
    where: { doctorId: DOCTOR_ID }
  })
  
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
  console.log(`🔬 Generated thousands of glucose readings across different alert categories`)
  console.log(`👨‍⚕️ All patients assigned to doctor: ${DOCTOR_ID}`)
  console.log(`📍 All patients located around University of Sharjah area`)
  console.log(`🚨 Patients will trigger various glucose alert combinations:`)
  console.log(`   • Normal patients: No or minimal alerts`)
  console.log(`   • Mild patients: Yellow warning alerts`)
  console.log(`   • Frequent patients: Orange danger alerts`)
  console.log(`   • Critical patients: Red critical alerts`)
  console.log(`   • Mixed patients: Combination of all alert types`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })