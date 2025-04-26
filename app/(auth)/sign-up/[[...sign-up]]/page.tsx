//TODO: Import and use the Sign up page from clerk
import { SignUp } from '@clerk/nextjs'

export default function Page(){
  return(
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  )
}