import { z } from "zod"

// ---- Helpers ----

// Keeps your original optional numeric helper (left intact for reuse if needed)
const optionalNumericField = (min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined
      if (typeof val === "string") {
        const num = Number(val.trim())
        return isNaN(num) ? undefined : num
      }
      return val
    },
    z.number().min(min).max(max).optional()
  )

// New: required numeric field (coerces strings, rejects empty)
const requiredNumericField = (min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return NaN
      if (typeof val === "string") {
        const num = Number(val.trim())
        return isNaN(num) ? NaN : num
      }
      return val
    },
    z
      .number({
        invalid_type_error: "A numeric value is required",
        required_error: "This field is required",
      })
      .min(min, { message: `Must be ≥ ${min}` })
      .max(max, { message: `Must be ≤ ${max}` })
  )

// Your original helper retained (not strictly needed now, but kept as requested)
const optionalStringField = () =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined || val === "not_specified") return undefined
      if (typeof val === "string") {
        const trimmed = val.trim()
        return trimmed === "" || trimmed === "not_specified" ? undefined : trimmed
      }
      return val
    },
    z.string().optional()
  )

// New: required string (no "not_specified")
const requiredStringField = () =>
  z.preprocess(
    (val) => {
      if (val === null || val === undefined) return ""
      if (typeof val === "string") return val.trim()
      return String(val)
    },
    z
      .string({ required_error: "This field is required" })
      .min(1, "This field is required")
      .refine((v) => v !== "not_specified", { message: "Please select a valid option" })
  )

export const clinicalInfoSchema = z.object({
  // Demographics (required, cannot be "not_specified")
  nationality: requiredStringField(),

  // Physical Measurements
  // BMI is now derived — keep optional so we don't block submission if client leaves it blank
  // (server will compute and overwrite anyway)
  bmi: optionalNumericField(10, 60),
  weight: requiredNumericField(30, 300),
  height: requiredNumericField(100, 250),
  weightGainDuringPregnancy: requiredNumericField(-20, 50),

  // Glucose and Lab Values
  fastingBloodGlucose: requiredNumericField(50, 400),
  oneHour75Glucose: requiredNumericField(50, 500),
  twoHour75Glucose: requiredNumericField(50, 500),

  // Clinical Conditions
  // Client already enforces selection; we still allow defaulting to "No" on empty just in case
  hypertensiveDisorders: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined || val === "not_specified") return "No"
      return val
    },
    z.enum(["Yes", "No"]).default("No")
  ),

  // Vital Signs
  pulseHeartRate: requiredNumericField(40, 200),
  bpSystolic: requiredNumericField(70, 250),
  bpDiastolic: requiredNumericField(40, 150),
})

export type ClinicalInfoFormData = z.infer<typeof clinicalInfoSchema>

// For clarity; BMI remains optional here because it’s computed server-side
export type ProcessedClinicalInfoData = {
  nationality: string
  bmi?: number
  weight: number
  height: number
  weightGainDuringPregnancy: number
  fastingBloodGlucose: number
  oneHour75Glucose: number
  twoHour75Glucose: number
  hypertensiveDisorders: "Yes" | "No"
  pulseHeartRate: number
  bpSystolic: number
  bpDiastolic: number
}
