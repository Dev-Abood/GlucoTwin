"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMessages, sendMessageToPatient, markMessagesAsRead } from "./actions";
import { ArrowLeft, Send, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

interface Patient {
  id: string;
  patientId: string;
  email: string;
  name: string;
  age: number;
  dateOfBirth: Date;
  term: number;
  dueDate: Date;
  hasMessageForDoctor: boolean;
}

interface Message {
  id: string;
  patientAssignmentId: string;
  senderId: string;
  senderType: "DOCTOR" | "PATIENT";
  content: string;
  timestamp: Date;
  isRead: boolean;
}

interface PatientWithAssignment extends Patient {
  assignment: {
    id: string;
    doctorId: string;
    lastVisitDate: Date;
  };
  lastReading?: {
    level: number;
    type: string;
  };
  status: "NORMAL" | "ELEVATED" | "HIGH";
}

interface MessagesPageProps {
  doctorData: {
    id: string;
    name: string;
  };
  patients: PatientWithAssignment[];
}

type StatusFilter = "all" | "NORMAL" | "ELEVATED" | "HIGH";
type MessageFilter = "all" | "unread";

export default function MessagesPage({ patients, doctorData }: MessagesPageProps) {
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<PatientWithAssignment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterMessages, setFilterMessages] = useState<MessageFilter>("all");

  // Filter patients by search + filters
  const filteredPatients = patients.filter((patient) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      patient.name.toLowerCase().includes(search) ||
      patient.patientId.toLowerCase().includes(search) ||
      patient.status.toLowerCase().includes(search);
    const matchesStatus = filterStatus === "all" || patient.status === filterStatus;
    const matchesMessages =
      filterMessages === "all" || (filterMessages === "unread" && patient.hasMessageForDoctor);

    return matchesSearch && matchesStatus && matchesMessages;
  });

  // Select patient, fetch messages, mark as read
  const handleSelectPatient = async (patient: PatientWithAssignment) => {
    setSelectedPatient(patient);

    // Mark messages as read (remove green dot)
    if (patient.hasMessageForDoctor) {
      await markMessagesAsRead(patient.assignment.id);
      patient.hasMessageForDoctor = false;
    }

    const msgs = await getMessages(patient.assignment.id);
    if (!("error" in msgs)) setMessages(msgs);
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPatient) return;

    const saved = await sendMessageToPatient(selectedPatient.assignment.id, newMessage);
    if (!("error" in saved)) {
      setMessages((prev) => [...prev, saved]);
      setNewMessage("");
    }
  };

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const handleBackToPatients = () => {
    router.push("/doctor/patients");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "HIGH":
        return "destructive";
      case "ELEVATED":
        return "secondary";
      default:
        return "outline";
    }
  };

  const PatientCard = ({ patient }: { patient: PatientWithAssignment }) => (
    <div
      key={patient.id}
      className="bg-white border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => handleSelectPatient(patient)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {patient.name.split(" ").map((n) => n[0]).join("")}
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
              <Badge variant={getStatusColor(patient.status)}>
                {patient.status.charAt(0).toUpperCase() + patient.status.slice(1).toLowerCase()}
              </Badge>
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
          {patient.hasMessageForDoctor && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat
          </Button>
        </div>
      </div>
    </div>
  );

  /* Chat View */
  if (selectedPatient) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header userType="doctor" />
        <div className="flex flex-1">
          <Sidebar userType="doctor" />
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
                      {selectedPatient.name.split(" ").map((n) => n[0]).join("")}
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
                      <Badge variant={getStatusColor(selectedPatient.status)}>
                        {selectedPatient.status.charAt(0).toUpperCase() +
                          selectedPatient.status.slice(1).toLowerCase()}
                      </Badge>
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
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderType === "DOCTOR" ? "justify-end" : "justify-start"
                    }`}
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
                          message.senderType === "DOCTOR"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
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
    );
  }

  /* Patient List View */
  return (
    <div className="flex min-h-screen flex-col">
      <Header userType="doctor"/>
      <div className="flex flex-1">
        <Sidebar userType="doctor" />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">Messages</h1>
              <Button variant="outline" onClick={handleBackToPatients}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Patients
              </Button>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col gap-4 sm:flex-row mb-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as StatusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="ELEVATED">Elevated</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>

              {/* Message Filter */}
              <Select value={filterMessages} onValueChange={(value) => setFilterMessages(value as MessageFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by message" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  <SelectItem value="unread">Unread Messages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Patients List */}
            <div className="space-y-3">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No patients found</div>
              ) : (
                filteredPatients.map((patient) => <PatientCard key={patient.id} patient={patient} />)
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
