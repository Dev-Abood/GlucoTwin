import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import OnboardingForm from "./onboarding-form"

export default async function Onboarding() {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  return (
    <div className="container max-w-3xl mx-auto py-10 px-4">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">
            Welcome, {user.firstName || user.emailAddresses[0].emailAddress.split("@")[0]}!
          </h1>
          <p className="text-muted-foreground">Please complete your profile to continue</p>
        </div>
        <OnboardingForm userEmail={user.emailAddresses[0].emailAddress} />
      </div>
    </div>
  )
}

