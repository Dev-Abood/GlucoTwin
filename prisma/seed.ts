import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const firstNamesF = ["Aisha","Fatima","Maryam","Sara","Noor","Huda","Amal","Leila","Zainab","Maha","Hanan","Rana","Yasmin","Lama","Dina","Salma","Reem","Nour","Habiba","Bushra","Alaa","Doaa","Shaikha","Mariam","Latifa","Amina","Balqees","Hiba","Iman","Jumana"];
const lastNames = ["Al Shamsi","Al Nuaimi","Al Qasimi","Al Suwaidi","Mahdi","Farouq","Bin Adam","Sayed","Hassan","Rahman","Ismail","Darwish","Khan","Hakeem","Nadeem"];
const areas = ["Al Majaz","Al Khan","Al Taawun","Al Nahda","Muwailih","University City","Al Qasimia","Al Qarayen","Al Mamzar","Rolla","Al Yarmook","Al Layyeh","Al Gharayen","Muwafjah","Al Suyoh"];

function rand(min: number, max: number): number { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number): number { return Math.floor(rand(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[randInt(0, arr.length - 1)]; }
function sharjahCoords(): { latitude: number; longitude: number } { return { latitude: rand(25.2800, 25.4500), longitude: rand(55.3300, 55.5200) }; }
function makeName(): { name: string } { return { name: `${pick(firstNamesF)} ${pick(lastNames)}` }; }
function makeDOBandAge(): { age: number; dateOfBirth: Date } { const age = randInt(18, 45); const now = new Date(); const dob = new Date(now); dob.setFullYear(now.getFullYear() - age); dob.setMonth(randInt(0, 11)); dob.setDate(randInt(1, 28)); return { age, dateOfBirth: dob }; }
function makePregnancyDates(termWeeks: number): { dueDate: Date } { const now = new Date(); const weeksLeft = Math.max(0, 40 - termWeeks); return { dueDate: new Date(now.getTime() + weeksLeft * 7 * 24 * 3600 * 1000) }; }
function makePatientId(i: number): string { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); return `P-${y}${m}-${String(i + 1).padStart(5, "0")}`; }
function makeAddress(): string { return `${pick(areas)}, Sharjah, UAE`; }

async function resetPatients() {
  await prisma.$transaction([
    prisma.message.deleteMany({}),
    prisma.recommendation.deleteMany({}),
    prisma.patientAssignment.deleteMany({}),
    prisma.reading.deleteMany({}),
    prisma.gDMPrediction.deleteMany({}),
    prisma.clinicalInformation.deleteMany({}),
    prisma.appointment.deleteMany({}),
    prisma.notification.deleteMany({ where: { patientId: { not: null } } }),
    prisma.patient.deleteMany({})
  ]);
}

async function main() {
  await resetPatients();

  const hospital = await prisma.hospital.upsert({
    where: { email: "contact@sharjah-general-hospital.ae" },
    update: {},
    create: {
      name: "Sharjah General Hospital",
      address: "Al Qasimia, Sharjah, UAE",
      phone: "+97160000000",
      email: "contact@sharjah-general-hospital.ae",
      ...sharjahCoords(),
      operatingHours: {
        monday: { open: "08:00", close: "20:00" },
        tuesday: { open: "08:00", close: "20:00" },
        wednesday: { open: "08:00", close: "20:00" },
        thursday: { open: "08:00", close: "20:00" },
        friday: { open: "09:00", close: "18:00" },
        saturday: { open: "09:00", close: "18:00" },
        sunday: { open: "09:00", close: "18:00" }
      } as Prisma.InputJsonValue
    }
  });

  const count = Number(process.env.SEED_PATIENTS ?? 200);
  const patients: Prisma.PatientCreateManyInput[] = [];

  for (let i = 0; i < count; i++) {
    const { name } = makeName();
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}.${i}@example.com`;
    const patientId = makePatientId(i);
    const { age, dateOfBirth } = makeDOBandAge();
    const term = randInt(8, 40);
    const { dueDate } = makePregnancyDates(term);
    const { latitude, longitude } = sharjahCoords();
    const phone = `+9715${randInt(0,9)}${randInt(0,9)}${randInt(0,9)}${randInt(0,9)}${randInt(0,9)}${randInt(0,9)}${randInt(0,9)}${randInt(0,9)}`;

    patients.push({
      patientId,
      email,
      phone,
      name,
      age,
      dateOfBirth,
      term,
      dueDate,
      latitude,
      longitude,
      address: makeAddress(),
      hospitalId: hospital.id
    });
  }

  await prisma.patient.createMany({ data: patients, skipDuplicates: true });
}

main()
  .then(async () => { await prisma.$disconnect(); process.exit(0); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
