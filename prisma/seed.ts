import { PrismaClient, ReadingStatus, ReadingType } from "@prisma/client";

const prisma = new PrismaClient();
const DOCTOR_ID = "user_35nTKMF87IjQy92H759amrVdSpI";

async function main() {
  console.log("🧹 Cleaning old demo patients + assignments...");

  const demoEmails = [
    "patient.stable@demo.local",
    "patient.high@demo.local",
    "patient.hypo@demo.local",
    "patient.variable@demo.local",
  ];

  // Find old demo patients
  const oldPatients = await prisma.patient.findMany({
    where: { email: { in: demoEmails } },
  });

  const oldPatientIds = oldPatients.map((p) => p.id);

  // Clean child tables
  await prisma.reading.deleteMany({ where: { patientId: { in: oldPatientIds } } });
  await prisma.message.deleteMany({
    where: { patientAssignment: { patientId: { in: oldPatientIds } } },
  });
  await prisma.recommendation.deleteMany({
    where: { patientAssignment: { patientId: { in: oldPatientIds } } },
  });
  await prisma.patientAssignment.deleteMany({
    where: {
      OR: [
        { patientId: { in: oldPatientIds } },
        { doctorId: DOCTOR_ID },
      ],
    },
  });

  await prisma.patient.deleteMany({
    where: { id: { in: oldPatientIds } },
  });

  console.log("✨ Cleanup complete");

  // Hospital
  const hospital = await prisma.hospital.upsert({
    where: { email: "demo.hospital@glucotwin.local" },
    update: {},
    create: {
      name: "Sharjah Women’s Health Center",
      address: "Al Nahda, Sharjah",
      phone: "+971-6-555-0000",
      email: "demo.hospital@glucotwin.local",
      latitude: 25.32,
      longitude: 55.40,
      operatingHours: {
        monday: { open: "08:00", close: "20:00" },
        tuesday: { open: "08:00", close: "20:00" },
        wednesday: { open: "08:00", close: "20:00" },
        thursday: { open: "08:00", close: "20:00" },
        friday: { open: "14:00", close: "20:00" },
        saturday: { open: "08:00", close: "20:00" },
        sunday: { open: "08:00", close: "20:00" },
      },
    },
  });

  // Doctor
  const doctor = await prisma.doctor.upsert({
    where: { id: DOCTOR_ID },
    update: {
      name: "Dr. Abdulla Salem",
      email: "dr.abdulla@demo.local",
      phone: "+971-50-123-4567",
      specialty: "Endocrinology",
      hospitalId: hospital.id,
    },
    create: {
      id: DOCTOR_ID,
      name: "Dr. Abdulla Salem",
      email: "dr.abdulla@demo.local",
      phone: "+971-50-123-4567",
      specialty: "Endocrinology",
      hospitalId: hospital.id,
    },
  });

  console.log("👨‍⚕️ Doctor seeded:", doctor.name);

  // Female patient profiles
  const patients = [
    {
      name: "Maryam Khalid",
      email: "patient.stable@demo.local",
      patientId: "PT-DEMO-001",
      profile: "stable",
    },
    {
      name: "Aisha Rahman",
      email: "patient.high@demo.local",
      patientId: "PT-DEMO-002",
      profile: "high",
    },
    {
      name: "Fatima Noor",
      email: "patient.hypo@demo.local",
      patientId: "PT-DEMO-003",
      profile: "hypo",
    },
    {
      name: "Layla Hassan",
      email: "patient.variable@demo.local",
      patientId: "PT-DEMO-004",
      profile: "variable",
    },
  ];

  const readingTypes: ReadingType[] = [
    "BEFORE_BREAKFAST",
    "AFTER_BREAKFAST",
    "BEFORE_LUNCH",
    "AFTER_LUNCH",
    "BEFORE_DINNER",
    "AFTER_DINNER",
  ];

  const timeMap = {
    BEFORE_BREAKFAST: "07:00",
    AFTER_BREAKFAST: "09:00",
    BEFORE_LUNCH: "12:30",
    AFTER_LUNCH: "14:30",
    BEFORE_DINNER: "18:30",
    AFTER_DINNER: "20:30",
  };

  const today = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 20);

  let total = 0;

  for (const p of patients) {
    console.log(`\n👤 Creating patient: ${p.name}`);

    const patient = await prisma.patient.upsert({
      where: { email: p.email },
      update: {
        name: p.name,
        patientId: p.patientId,
        hospitalId: hospital.id,
      },
      create: {
        patientId: p.patientId,
        email: p.email,
        phone: "+971-50-222-1111",
        name: p.name,
        age: 29,
        dateOfBirth: new Date("1996-01-01"),
        term: 27,
        dueDate: new Date("2025-02-21"),
        latitude: 25.315,
        longitude: 55.395,
        address: "Sharjah, UAE",
        hospitalId: hospital.id,
      },
    });

    // Assignment
    await prisma.patientAssignment.create({
      data: {
        doctorId: DOCTOR_ID,
        patientId: patient.id,
        lastVisitDate: new Date(),
        addedDate: new Date(start.getTime() - 5 * 86400000),
      },
    });

    // Generate readings
    const readings = [];

    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      for (const type of readingTypes) {
        const dateOnly = new Date(d);
        dateOnly.setHours(0, 0, 0, 0);

        let base = 90;
        let variance = 12;

        if (p.profile === "high") {
          base = 150;
          variance = 30;
        }
        if (p.profile === "hypo") {
          base = 70;
          variance = 25;
        }
        if (p.profile === "variable") {
          base = 110;
          variance = 40;
        }

        let level = base + (Math.random() - 0.5) * variance * 2;
        level = Math.max(50, Math.min(220, level));
        level = Math.round(level * 10) / 10;

        const isBefore = type.includes("BEFORE");

        const status: ReadingStatus = isBefore
          ? level >= 95
            ? "HIGH"
            : level >= 90
            ? "ELEVATED"
            : "NORMAL"
          : level >= 140
          ? "HIGH"
          : level >= 130
          ? "ELEVATED"
          : "NORMAL";

        readings.push({
          patientId: patient.id,
          date: dateOnly,
          time: timeMap[type],
          type,
          level,
          status,
          notes: null,
        });
      }
    }

    await prisma.reading.createMany({
      data: readings,
    });

    total += readings.length;

    console.log(`📈 Added ${readings.length} readings for ${p.name}`);
  }

  console.log("\n🎉 DONE!");
  console.log("Total readings:", total);
  console.log("Patients created:", patients.length);
  console.log("Doctor:", doctor.name);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
