import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getClinicalInfo, getPatient } from "./actions"
import ClinicalInfoPage from "./clinical-info-page"

interface PageProps {
  params: {
    id: string
  }
}

export default async function Page({ params }: PageProps) {
  const { id: patientId } = params

  try {
    // Fetch patient and clinical info in parallel
    const [patient, clinicalInfo] = await Promise.all([
      getPatient(patientId), 
      getClinicalInfo(patientId)
    ])

    if (!patient) {
      notFound()
    }

    return (
      <Suspense fallback={<div>Loading clinical information...</div>}>
        <ClinicalInfoPage patient={patient} clinicalInfo={clinicalInfo} />
      </Suspense>
    )
  } catch (error) {
    console.error("Error loading clinical info page:", error)
    notFound()
  }
}