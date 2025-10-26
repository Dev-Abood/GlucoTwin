// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...\n");

  // ============================================
  // 1. CREATE HOSPITAL
  // ============================================
  console.log("🏥 Creating hospital...");
  const hospital = await prisma.hospital.create({
    data: {
      name: "Dubai Medical Center",
      address: "Sheikh Zayed Road, Dubai, UAE",
      phone: "+971-4-3456789",
      email: "info@dubaimedical.ae",
      latitude: 25.2048,
      longitude: 55.2708,
      operatingHours: {
        monday: { open: "07:00", close: "21:00" },
        tuesday: { open: "07:00", close: "21:00" },
        wednesday: { open: "07:00", close: "21:00" },
        thursday: { open: "07:00", close: "21:00" },
        friday: { open: "07:00", close: "14:00" },
        saturday: { open: "09:00", close: "17:00" },
        sunday: { open: "Closed", close: "Closed" },
      },
    },
  });
  console.log("✅ Hospital created:", hospital.name, "\n");

  // ============================================
  // 2. CREATE DOCTORS
  // ============================================
  console.log("👨‍⚕️ Creating doctors...");
  
  const doctor1 = await prisma.doctor.create({
    data: {
      id: "doctor-1-uuid",
      email: "dr.sarah@dubaimedical.ae",
      phone: "+971-50-1234567",
      name: "Dr. Sarah Ahmed",
      specialty: "Endocrinology",
      hospitalId: hospital.id,
      licenseNumber: "DHA-12345",
      yearsOfExperience: 12,
      bio: "Specialized in gestational diabetes management with over 12 years of experience.",
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      id: "doctor-2-uuid",
      email: "dr.omar@dubaimedical.ae",
      phone: "+971-50-2345678",
      name: "Dr. Omar Hassan",
      specialty: "Obstetrics",
      hospitalId: hospital.id,
      licenseNumber: "DHA-23456",
      yearsOfExperience: 8,
      bio: "Expert in high-risk pregnancy management and prenatal care.",
    },
  });

  const doctor3 = await prisma.doctor.create({
    data: {
      id: "doctor-3-uuid",
      email: "dr.fatima@dubaimedical.ae",
      phone: "+971-50-3456789",
      name: "Dr. Fatima Al Zaabi",
      specialty: "Nutrition",
      hospitalId: hospital.id,
      licenseNumber: "DHA-34567",
      yearsOfExperience: 6,
      bio: "Specialized nutritionist focusing on gestational diabetes dietary management.",
    },
  });

  console.log("✅ Created 3 doctors\n");

  // ============================================
  // 3. CREATE DOCTOR AVAILABILITY
  // ============================================
  console.log("📅 Setting up doctor availability...");

  // Dr. Sarah's weekly schedule (Monday-Friday, 8:00-17:00)
  const weekdays = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ] as const;

  for (const day of weekdays) {
    await prisma.doctorAvailability.create({
      data: {
        doctorId: doctor1.id,
        dayOfWeek: day,
        startTime: "08:00",
        endTime: "17:00",
        isAvailable: true,
        isRecurring: true,
      },
    });
  }

  // Dr. Omar's weekly schedule (Monday-Saturday, 9:00-18:00)
  const daysIncludingSaturday = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ] as const;

  for (const day of daysIncludingSaturday) {
    await prisma.doctorAvailability.create({
      data: {
        doctorId: doctor2.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "18:00",
        isAvailable: true,
        isRecurring: true,
      },
    });
  }

  // Dr. Fatima's weekly schedule (Sunday-Thursday, 10:00-16:00)
  const sundayToThursday = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
  ] as const;

  for (const day of sundayToThursday) {
    await prisma.doctorAvailability.create({
      data: {
        doctorId: doctor3.id,
        dayOfWeek: day,
        startTime: "10:00",
        endTime: "16:00",
        isAvailable: true,
        isRecurring: true,
      },
    });
  }

  console.log("✅ Doctor availability set up\n");

  // ============================================
  // 4. CREATE SAMPLE PATIENTS
  // ============================================
  console.log("👤 Creating sample patients...");

  const patient1 = await prisma.patient.create({
    data: {
      id: "patient-1-uuid",
      patientId: "P001",
      email: "patient1@example.com",
      phone: "+971-50-9876543",
      name: "Aisha Mohammed",
      age: 28,
      dateOfBirth: new Date("1997-05-15"),
      term: 24,
      dueDate: new Date("2025-12-15"),
      hospitalId: hospital.id,
      address: "Jumeirah, Dubai, UAE",
      latitude: 25.2318,
      longitude: 55.2590,
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      id: "patient-2-uuid",
      patientId: "P002",
      email: "patient2@example.com",
      phone: "+971-50-8765432",
      name: "Mariam Ali",
      age: 32,
      dateOfBirth: new Date("1993-08-22"),
      term: 28,
      dueDate: new Date("2025-11-30"),
      hospitalId: hospital.id,
      address: "Marina, Dubai, UAE",
      latitude: 25.0805,
      longitude: 55.1410,
    },
  });

  console.log("✅ Created 2 sample patients\n");

  // ============================================
  // 5. CREATE PATIENT ASSIGNMENTS
  // ============================================
  console.log("🔗 Creating patient assignments...");

  await prisma.patientAssignment.create({
    data: {
      doctorId: doctor1.id,
      patientId: patient1.id,
      addedDate: new Date(),
      lastVisitDate: new Date("2025-10-15"),
    },
  });

  await prisma.patientAssignment.create({
    data: {
      doctorId: doctor2.id,
      patientId: patient1.id,
      addedDate: new Date(),
      lastVisitDate: new Date("2025-10-10"),
    },
  });

  await prisma.patientAssignment.create({
    data: {
      doctorId: doctor1.id,
      patientId: patient2.id,
      addedDate: new Date(),
      lastVisitDate: new Date("2025-10-20"),
    },
  });

  console.log("✅ Patient assignments created\n");

  // ============================================
  // 6. CREATE SAMPLE APPOINTMENTS
  // ============================================
  console.log("📆 Creating sample appointments...");

  // Future appointment
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // Next week
  futureDate.setHours(10, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor1.id,
      appointmentDate: futureDate,
      endTime: new Date(futureDate.getTime() + 50 * 60000), // +50 minutes
      status: "SCHEDULED",
      type: "FOLLOW_UP",
      reasonForVisit: "Regular glucose monitoring checkup",
    },
  });

  // Past completed appointment
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 14); // Two weeks ago
  pastDate.setHours(14, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      doctorId: doctor1.id,
      appointmentDate: pastDate,
      endTime: new Date(pastDate.getTime() + 50 * 60000),
      status: "COMPLETED",
      type: "CONSULTATION",
      reasonForVisit: "Initial GDM consultation",
      doctorNotes: "Patient showing good glucose control. Continue current management plan.",
    },
  });

  console.log("✅ Sample appointments created\n");

  // ============================================
  // 7. CREATE SAMPLE GLUCOSE READINGS
  // ============================================
  console.log("📊 Creating sample glucose readings...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.reading.create({
    data: {
      patientId: patient1.id,
      date: today,
      time: "08:00",
      type: "BEFORE_BREAKFAST",
      level: 92.5,
      status: "NORMAL",
      notes: "Feeling good this morning",
    },
  });

  await prisma.reading.create({
    data: {
      patientId: patient1.id,
      date: today,
      time: "10:00",
      type: "AFTER_BREAKFAST",
      level: 138.0,
      status: "NORMAL",
    },
  });

  console.log("✅ Sample glucose readings created\n");

  // ============================================
  // SUMMARY
  // ============================================
  console.log("========================================");
  console.log("✅ Database seeding completed!");
  console.log("========================================");
  console.log(`🏥 Hospital: ${hospital.name}`);
  console.log(`👨‍⚕️ Doctors: 3`);
  console.log(`👤 Patients: 2`);
  console.log(`📆 Appointments: 2`);
  console.log(`📊 Glucose Readings: 2`);
  console.log("========================================\n");

  console.log("📋 Test Accounts:");
  console.log("\nDoctors:");
  console.log(`  - ${doctor1.email} (${doctor1.name})`);
  console.log(`  - ${doctor2.email} (${doctor2.name})`);
  console.log(`  - ${doctor3.email} (${doctor3.name})`);
  console.log("\nPatients:");
  console.log(`  - ${patient1.email} (${patient1.name})`);
  console.log(`  - ${patient2.email} (${patient2.name})`);
  console.log("\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });