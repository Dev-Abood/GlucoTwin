//TODO: Design messages panel 
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Send, Search, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import { retrievePatientsList } from "./actions"

// interface types based on schema
interface Patient {
  id: string
  patientId: string
  email: string
  name: string
  age: number
  dateOfBirth: Date
  term: number
  dueDate: Date
  hasMessage: boolean
}

interface Message {
  id: string
  patientAssignmentId: string
  senderId: string
  senderType: "DOCTOR" | "PATIENT"
  content: string
  timestamp: Date
  isRead: boolean
}

interface PatientWithAssignment extends Patient {
  assignment: {
    id: string
    doctorId: string
    lastVisitDate: Date
  }
  lastReading?: {
    level: number
    type: string
  }
  status: "normal" | "elevated" | "high"
}


interface MessagesPageProps {
  doctorData: {
    name: string
  }
  patients: PatientWithAssignment[] // This will come from our database
}

// Mock data for demonstration
const mockPatients: PatientWithAssignment[] = [
  {
    id: "1",
    patientId: "P22103623",
    email: "layla@example.com",
    name: "Layla Abdulwahab Mahmoud",
    age: 28,
    dateOfBirth: new Date("1996-06-14"),
    term: 19,
    dueDate: new Date("2026-02-21"),
    hasMessage: false,
    status: "high",
    assignment: {
      id: "assign1",
      doctorId: "doc1",
      lastVisitDate: new Date("2025-01-01"),
    },
    lastReading: {
      level: 151,
      type: "AFTER_LUNCH",
    },
  },
  {
    id: "2",
    patientId: "P22342515",
    email: "jamila@example.com",
    name: "Jamila Salim Nasser",
    age: 29,
    dateOfBirth: new Date("1995-09-06"),
    term: 12,
    dueDate: new Date("2025-12-15"),
    hasMessage: false,
    status: "high",
    assignment: {
      id: "assign2",
      doctorId: "doc1",
      lastVisitDate: new Date("2025-01-01"),
    },
    lastReading: {
      level: 89,
      type: "BEFORE_BREAKFAST",
    },
  },
  {
    id: "3",
    patientId: "P27700144",
    email: "mariam@example.com",
    name: "Mariam Saeed Rashed Kais",
    age: 32,
    dateOfBirth: new Date("1992-04-01"),
    term: 16,
    dueDate: new Date("2025-10-20"),
    hasMessage: true,
    status: "normal",
    assignment: {
      id: "assign3",
      doctorId: "doc1",
      lastVisitDate: new Date("2025-01-01"),
    },
    lastReading: {
      level: 95,
      type: "BEFORE_DINNER",
    },
  },
]

const mockMessages: Message[] = [
  {
    id: "1",
    patientAssignmentId: "assign1",
    senderId: "1",
    senderType: "PATIENT",
    content: "Good morning Dr. Abdulla. I recorded my morning glucose reading and it seems a bit high today.",
    timestamp: new Date("2025-01-03T08:30:00"),
    isRead: true,
  },
  {
    id: "2",
    patientAssignmentId: "assign1",
    senderId: "doc1",
    senderType: "DOCTOR",
    content:
      "Good morning Layla. I can see your reading of 151 mg/dL. Have you been following your meal plan as discussed?",
    timestamp: new Date("2025-01-03T09:15:00"),
    isRead: true,
  },
]

export default function MessagesPage({ patients = mockPatients }: MessagesPageProps) {
  const router = useRouter()
  const [selectedPatient, setSelectedPatient] = useState<PatientWithAssignment | null>(null)
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedPatient) return

    const message: Message = {
      id: Date.now().toString(),
      patientAssignmentId: selectedPatient.assignment.id,
      senderId: "doc1",
      senderType: "DOCTOR",
      content: newMessage.trim(),
      timestamp: new Date(),
      isRead: true,
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getPatientMessages = (patientAssignmentId: string) => {
    return messages.filter((msg) => msg.patientAssignmentId === patientAssignmentId)
  }

  const handleBackToPatients = () => {
    router.push("/doctor/patients")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "high":
        return "destructive"
      case "elevated":
        return "secondary"
      default:
        return "outline"
    }
  }

  // Patient Card Component for mapping
  const PatientCard = ({ patient }: { patient: PatientWithAssignment }) => (
    <div
      key={patient.id}
      className="bg-white border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => setSelectedPatient(patient)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900">{patient.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>ID: {patient.patientId}</span>
              <span>•</span>
              <span>{patient.age} years</span>
              <span>•</span>
              <span>{patient.term} weeks</span>
              <span>•</span>
              <Badge variant={getStatusColor(patient.status)}>{patient.status}</Badge>
              {patient.lastReading && (
                <>
                  <span>•</span>
                  <span>Last: {patient.lastReading.level} mg/dL</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {patient.hasMessage && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat
          </Button>
        </div>
      </div>
    </div>
  )

  if (selectedPatient) {
    const patientMessages = getPatientMessages(selectedPatient.assignment.id)

    return (
      <div className="flex min-h-screen flex-col">
        {/* Header section */}
        <Header />
        {/* Main content area */}
        <div className="flex flex-1">
          {/* Sidebar Navigation */}
          <Sidebar userType="doctor" />
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="flex flex-col h-[calc(100vh-4rem)]">
              {/* Chat Header */}
              <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Messages
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBackToPatients}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Patients
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {selectedPatient.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-xl font-semibold">{selectedPatient.name}</h1>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>ID: {selectedPatient.patientId}</span>
                      <span>•</span>
                      <span>{selectedPatient.age} years</span>
                      <span>•</span>
                      <span>{selectedPatient.term} weeks</span>
                      <span>•</span>
                      <Badge variant={getStatusColor(selectedPatient.status)}>{selectedPatient.status}</Badge>
                      {selectedPatient.lastReading && (
                        <>
                          <span>•</span>
                          <span>Last: {selectedPatient.lastReading.level} mg/dL</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                <div className="flex justify-center">
                  <span className="bg-white text-muted-foreground text-xs px-3 py-1 rounded-full border">Today</span>
                </div>

                {patientMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === "DOCTOR" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-md ${
                        message.senderType === "DOCTOR"
                          ? "bg-primary text-primary-foreground"
                          : "bg-white border text-foreground"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <span
                        className={`text-xs ${
                          message.senderType === "DOCTOR" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t p-4">
                <div className="flex space-x-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Patient List View - Card Style
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header section */}
      <Header />
      {/* Main content area */}
      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <Sidebar userType="doctor" />
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Messages</h1>
                  <p className="text-muted-foreground">Chat with your gestational diabetes patients</p>
                </div>
                <Button variant="outline" onClick={handleBackToPatients}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Patients
                </Button>
              </div>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Patient Messages</CardTitle>
                <CardDescription>Select a patient to start or continue a conversation</CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No patients found</div>
                  ) : (
                    // Mapping function for patient list - easy to replace with your database query
                    filteredPatients.map((patient) => <PatientCard key={patient.id} patient={patient} />)
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
