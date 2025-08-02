"use client"; //! Client component, re-renders and auth and react hooks run here, commands run on browser console.

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

//TODO: This will chnage into the 6 test cases we have
const HIGH_GLUCOSE_THRESHOLD = 140;

//* Define the return and data types that we are getting from the props data passed by the server component
interface DashboardProps {
  doctorData: {
    name: string;
    patientAssignments: {
      addedDate: Date;
      patient: {
        id: string;
        name: string;
        readings: {
          date: Date;
          type: String;
          level: number;
        }[];
      };
    }[];
  };
}

export default function Dashboard({ doctorData }: DashboardProps){
  const [isLoading, setIsLoading] = useState(true); // track loading status

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const totalPatients = doctorData.patientAssignments.length;
  console.log(doctorData)
  
  let requireAttentionCount = 0;

  for(const { patient } of doctorData.patientAssignments) {
    for(const reading of patient.readings){
      const typeStr = String(reading.type).toLowerCase();
      const isBefore = typeStr.includes("before");
      const threshold = isBefore ? 105 : 160;

      if (reading.level > threshold) {
        requireAttentionCount++;
        break;  // stop at first “high” reading for this patient
      }
    }
  }

  const requireAttention = requireAttentionCount;


  const newThisMonth = doctorData.patientAssignments.filter(
    ({ addedDate }) => new Date(addedDate) >= firstDayOfMonth
  ).length;

  useEffect(() => {
    if (doctorData) {
      setIsLoading(false);
    }
  }, [doctorData]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header section */}
      <Header />

      {/* Main content area */}
      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <Sidebar userType="doctor" />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-3xl font-bold">
                    Welcome, {doctorData.name}
                  </h1>
                  <p className="text-muted-foreground">
                    Manage your gestational diabetes patients
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Total Patients</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{totalPatients}</div>
                      <p className="text-xs text-muted-foreground">
                        +{newThisMonth} new this month
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Requiring Attention</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {requireAttention}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Elevated glucose levels
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
