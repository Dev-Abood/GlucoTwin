//TODO: Server component of the doctor, fetch the data then display it using the child component dashboard.tsx

import { notFound, redirect } from "next/navigation"; //nextjs elements 
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma"; //prisma for writing the queries
import Dashboard from "./dashboard";

export default async function DoctorDashboard(){
  //* First check if the user is authorized and signed in, if not, redirect to sign up page (as double checking)
  const { userId } = await auth();

  if(!userId){
    redirect("/sign-up");
  }

  //! Query fetching the doctor's data
  const doctorData = await prisma.doctor.findUnique({
    where: {
      id: userId,
    },
    select: {	//* fetch the needed data like the name, the patient assignments & readings, dates, so on 
      name: true,
      //* Nested query:
      patientAssignments: {
        select: {
          patient: {
            select: {
              id: true,
              name: true,
              readings: {
                select: { //* selecting only the data we need
                  level: true,
                  type: true,
                  date: true,
                },
                orderBy: { //* Order them in descending orders of the date so we have the newest at topmost
                  date: "desc",
                },
              },
            },
          },
          addedDate: true,
        },
      },
    },
  });

  //! In case there was no return from the query, display a notFound error from nextjs
  if(!doctorData){
    return notFound();
  }

  //! Since this is a server component we will use the Dashboard component to display client side data 
  return <Dashboard doctorData={doctorData} />;
}
