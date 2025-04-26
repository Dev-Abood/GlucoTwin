// "use client"

// import { useState } from "react"
// import { zodResolver } from "@hookform/resolvers/zod"
// import { useForm } from "react-hook-form"
// import { z } from "zod"
// import { CalendarIcon } from "lucide-react"
// import { format, differenceInYears, addWeeks } from "date-fns"
// import { useRouter } from "next/navigation"

// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// import { Calendar } from "@/components/ui/calendar"
// import { useToast } from "@/hooks/use-toast"
// import { createPatient } from "./actions"

// // Maximum weeks of pregnancy
// const MAX_PREGNANCY_WEEKS = 42

// // Form schema with validation
// const formSchema = z.object({
//   name: z.string().min(2, { message: "Name must be at least 2 characters." }),
//   patientId: z.string().min(1, { message: "Patient ID is required." }),
//   dateOfBirth: z
//     .date({
//       required_error: "Date of birth is required.",
//     })
//     .refine((date) => date <= new Date(), {
//       message: "Date of birth cannot be in the future.",
//     }),
//   term: z.coerce
//     .number()
//     .min(0, { message: "Term cannot be negative." })
//     .max(MAX_PREGNANCY_WEEKS, { message: `Term cannot exceed ${MAX_PREGNANCY_WEEKS} weeks.` }),
//   dueDate: z.date({
//     required_error: "Due date is required.",
//   }),
// })

// type FormValues = z.infer<typeof formSchema>

// export default function OnboardingForm({ userEmail }: { userEmail: string }) {
//   const { toast } = useToast()
//   const router = useRouter()
//   const [isSubmitting, setIsSubmitting] = useState(false)

//   const form = useForm<FormValues>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       name: "",
//       patientId: "",
//       term: 0,
//     },
//   })

//   const dateOfBirth = form.watch("dateOfBirth")
//   const term = form.watch("term")

//   // Calculate age from date of birth
//   const age = dateOfBirth ? differenceInYears(new Date(), dateOfBirth) : null

//   // Calculate due date based on term
//   const calculateDueDate = (dob: Date, weeks: number) => {
//     if (!dob || weeks === undefined) return undefined

//     // Assuming due date is current date plus remaining weeks
//     return addWeeks(new Date(), MAX_PREGNANCY_WEEKS - weeks)
//   }

//   // Update due date when term changes
//   if (dateOfBirth && term !== undefined) {
//     const calculatedDueDate = calculateDueDate(dateOfBirth, term)
//     if (calculatedDueDate && (!form.getValues("dueDate") || form.getValues("term") !== term)) {
//       form.setValue("dueDate", calculatedDueDate)
//     }
//   }

//   async function onSubmit(data: FormValues) {
//     setIsSubmitting(true)

//     try {
//       const result = await createPatient({
//         ...data,
//         email: userEmail,
//         age: age || 0,
//       })

//       if (result.error) {
//         toast({
//           title: "Error",
//           description: result.error,
//           variant: "destructive",
//         })
//       } else {
//         toast({
//           title: "Success",
//           description: "Your profile has been created successfully.",
//         })
//         router.push("/patient/dashboard")
//       }
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Something went wrong. Please try again.",
//         variant: "destructive",
//       })
//     } finally {
//       setIsSubmitting(false)
//     }
//   }

//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
//         <div className="space-y-4">
//           <FormField
//             control={form.control}
//             name="name"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Full Name</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Enter your full name" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={form.control}
//             name="patientId"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Patient ID</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Enter your patient ID" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={form.control}
//             name="dateOfBirth"
//             render={({ field }) => (
//               <FormItem className="flex flex-col">
//                 <FormLabel>Date of Birth</FormLabel>
//                 <Popover>
//                   <PopoverTrigger asChild>
//                     <FormControl>
//                       <Button
//                         variant="outline"
//                         className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
//                       >
//                         {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
//                         <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
//                       </Button>
//                     </FormControl>
//                   </PopoverTrigger>
//                   <PopoverContent className="w-auto p-0" align="start">
//                     <Calendar
//                       mode="single"
//                       selected={field.value}
//                       onSelect={field.onChange}
//                       disabled={(date) => date > new Date()}
//                       initialFocus
//                     />
//                   </PopoverContent>
//                 </Popover>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {age !== null && (
//             <div className="space-y-2">
//               <Label htmlFor="age">Age</Label>
//               <Input id="age" value={age} disabled className="bg-muted" />
//             </div>
//           )}

//           <FormField
//             control={form.control}
//             name="term"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Term (Weeks of Pregnancy)</FormLabel>
//                 <FormControl>
//                   <Input
//                     type="number"
//                     min={0}
//                     max={MAX_PREGNANCY_WEEKS}
//                     placeholder="Enter weeks of pregnancy"
//                     {...field}
//                   />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={form.control}
//             name="dueDate"
//             render={({ field }) => (
//               <FormItem className="flex flex-col">
//                 <FormLabel>Due Date (Expected Birth Date)</FormLabel>
//                 <Popover>
//                   <PopoverTrigger asChild>
//                     <FormControl>
//                       <Button
//                         variant="outline"
//                         className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
//                       >
//                         {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
//                         <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
//                       </Button>
//                     </FormControl>
//                   </PopoverTrigger>
//                   <PopoverContent className="w-auto p-0" align="start">
//                     <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
//                   </PopoverContent>
//                 </Popover>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//         </div>

//         <Button type="submit" className="w-full" disabled={isSubmitting}>
//           {isSubmitting ? "Submitting..." : "Complete Registration"}
//         </Button>
//       </form>
//     </Form>
//   )
// }

"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon } from "lucide-react"
import { format, differenceInYears, addWeeks } from "date-fns"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { createPatient } from "./actions"

// Maximum weeks of pregnancy
const MAX_PREGNANCY_WEEKS = 42

// Form schema with validation
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  patientId: z.string().min(1, { message: "Patient ID is required." }),
  dateOfBirth: z
    .string({ required_error: "Date of birth is required." })
    .refine((str) => !isNaN(Date.parse(str)), {
      message: "Invalid date format. Use YYYY-MM-DD.",
    })
    .refine((str) => new Date(str) <= new Date(), {
      message: "Date of birth cannot be in the future.",
    }),
  term: z
    .coerce
    .number()
    .min(0, { message: "Term cannot be negative." })
    .max(MAX_PREGNANCY_WEEKS, {
      message: `Term cannot exceed ${MAX_PREGNANCY_WEEKS} weeks.`,
    }),
  dueDate: z
    .string({ required_error: "Due date is required." })
    .refine((str) => !isNaN(Date.parse(str)), {
      message: "Invalid date format. Use YYYY-MM-DD.",
    }),
})

type FormValues = z.infer<typeof formSchema>

export default function OnboardingForm({ userEmail }: { userEmail: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      patientId: "",
      term: 0,
      dateOfBirth: "",
      dueDate: "",
    },
  })

  const dateOfBirth = form.watch("dateOfBirth")
  const term = form.watch("term")

  // Calculate age from date of birth
  const age = dateOfBirth
    ? differenceInYears(new Date(), new Date(dateOfBirth))
    : null

  // Calculate due date based on term
  const calculateDueDate = (dob: string, weeks: number) => {
    if (!dob || weeks === undefined) return undefined

    // Assuming due date is current date plus remaining weeks
    return addWeeks(new Date(), MAX_PREGNANCY_WEEKS - weeks)
      .toISOString()
      .split("T")[0] // YYYY-MM-DD
  }

  // Update due date when term changes
  if (dateOfBirth && term !== undefined) {
    const calculated = calculateDueDate(dateOfBirth, term)
    if (
      calculated &&
      (!form.getValues("dueDate") || form.getValues("term") !== term)
    ) {
      form.setValue("dueDate", calculated)
    }
  }

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)

    try {
      const result = await createPatient({
        name: data.name,
        patientId: data.patientId,
        dateOfBirth: new Date(data.dateOfBirth),
        term: data.term,
        dueDate: new Date(data.dueDate),
        email: userEmail,
        age: age || 0,
      })

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Your profile has been created successfully.",
        })
        router.push("/patient/dashboard")
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          {/* Full Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Patient ID */}
          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient ID</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your patient ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date of Birth */}
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    placeholder="YYYY-MM-DD"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Displayed Age */}
          {age !== null && (
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" value={age} disabled className="bg-muted" />
            </div>
          )}

          {/* Term */}
          <FormField
            control={form.control}
            name="term"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Term (Weeks of Pregnancy)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={MAX_PREGNANCY_WEEKS}
                    placeholder="Enter weeks of pregnancy"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Due Date */}
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date (Expected Birth Date)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    placeholder="YYYY-MM-DD"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Complete Registration"}
        </Button>
      </form>
    </Form>
  )
}
