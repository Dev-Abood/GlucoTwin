"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Mail, Stethoscope, Users, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import { getDoctorProfile, updateDoctorProfile } from "./doctor-profile-actions"

interface DoctorProfile {
  id: string
  email: string
  name: string
  phone: string
  specialty: string | null
  patientAssignments: {
    patient: {
      name: string
      patientId: string
    }
  }[]
}

export default function DoctorProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState({
    email: "",
    phone: "",
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await getDoctorProfile()
      setProfile(data)
      setEditData({
        email: data.email,
        phone: data.phone,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      const result = await updateDoctorProfile(editData)

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Profile updated successfully",
        })
        setIsEditing(false)
        await loadProfile() // Reload to get updated data
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setEditData({
        email: profile.email,
        phone: profile.phone,
      })
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header userType="doctor" />
        <div className="flex flex-1">
          <Sidebar userType="doctor" />
          <main className="flex-1 overflow-auto">
            <div className="container py-6">
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header userType="doctor" />
        <div className="flex flex-1">
          <Sidebar userType="doctor" />
          <main className="flex-1 overflow-auto">
            <div className="container py-6">
              <div className="text-center py-20">
                <p className="text-muted-foreground">Profile not found</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header userType="doctor" />
      <div className="flex flex-1">
        <Sidebar userType="doctor" />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div>
                    <h1 className="text-3xl font-bold">My Profile</h1>
                    <p className="text-muted-foreground">View and manage your profile information</p>
                  </div>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Your basic profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                    <p className="text-lg font-semibold">{profile.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Specialty</Label>
                    <p className="text-lg">{profile.specialty || "General Practice"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground block">Role</Label>
                    <Badge className="bg-blue-100 text-blue-800">Healthcare Provider</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>Your contact details (editable)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                      Email Address
                    </Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-lg">{profile.email}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">
                      Phone Number
                    </Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-lg">{profile.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Stethoscope className="h-5 w-5 mr-2" />
                    Professional Information
                  </CardTitle>
                  <CardDescription>Your medical practice details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Medical System</Label>
                    <p className="text-lg">GlucoTwin Healthcare</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                    <p className="text-lg">Gestational Diabetes Care</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground block">Status</Label>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Patient Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Patient Overview
                  </CardTitle>
                  <CardDescription>Your current patient assignments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Total Patients</Label>
                    <p className="text-2xl font-bold text-primary">{profile.patientAssignments.length}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Recent Patients</Label>
                    <div className="space-y-2 mt-2">
                      {profile.patientAssignments.slice(0, 3).map((assignment, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{assignment.patient.name}</span>
                          <span className="text-muted-foreground">{assignment.patient.patientId}</span>
                        </div>
                      ))}
                      {profile.patientAssignments.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          +{profile.patientAssignments.length - 3} more patients
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
