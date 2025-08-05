"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMessages, sendMessageToDoctor, markMessagesAsRead } from "./actions";
import { ArrowLeft, Send, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
}

interface DoctorWithAssignment {
  assignmentId: string;
  doctor: Doctor;
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

interface MessagesPageProps {
  patientData: { id: string; name: string };
  doctors: DoctorWithAssignment[];
}

export default function MessagesPageClient({ patientData, doctors }: MessagesPageProps) {
  const router = useRouter();
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithAssignment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  const filteredDoctors = doctors.filter((d) =>
    d.doctor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectDoctor = async (doctor: DoctorWithAssignment) => {
    setSelectedDoctor(doctor);
    setLoadingMessages(true);
    const msgs = await getMessages(doctor.assignmentId);
    if (!("error" in msgs)) {
      setMessages(msgs);
      await markMessagesAsRead(doctor.assignmentId); // Clear indicator
    }
    setLoadingMessages(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDoctor) return;

    const tempMessage: Message = {
      id: Date.now().toString(),
      patientAssignmentId: selectedDoctor.assignmentId,
      senderId: patientData.id,
      senderType: "PATIENT",
      content: newMessage.trim(),
      timestamp: new Date(),
      isRead: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    await sendMessageToDoctor(selectedDoctor.assignmentId, newMessage);
  };

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  if (selectedDoctor) {
    const doctorMessages = messages.filter(
      (msg) => msg.patientAssignmentId === selectedDoctor.assignmentId
    );

    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar userType="patient" />
          <main className="flex-1 overflow-auto">
            <div className="flex flex-col h-[calc(100vh-4rem)]">
              <div className="bg-white border-b px-6 py-4">
                <Button variant="outline" size="sm" onClick={() => setSelectedDoctor(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Doctors
                </Button>
                <div className="flex items-center mt-4 space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-green-100 text-green-600">
                      {selectedDoctor.doctor.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-xl font-semibold">{selectedDoctor.doctor.name}</h1>
                    <p className="text-sm text-muted-foreground">{selectedDoctor.doctor.specialty}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  doctorMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderType === "PATIENT" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-md ${
                          message.senderType === "PATIENT"
                            ? "bg-primary text-primary-foreground"
                            : "bg-white border text-foreground"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span
                          className={`text-xs ${
                            message.senderType === "PATIENT"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="bg-white border-t p-4">
                <div className="flex space-x-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
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

  // Doctor list view
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar userType="patient" />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <h1 className="text-3xl font-bold">Message Your Doctor</h1>
            <p className="text-muted-foreground mb-6">
              Select a doctor to start or continue a conversation
            </p>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Doctors</CardTitle>
                <CardDescription>Your overseeing doctors</CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search doctors..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredDoctors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    You don't currently have a doctor assigned. Please wait.
                  </div>
                ) : (
                  filteredDoctors.map((d) => (
                    <div
                      key={d.assignmentId}
                      className="bg-white border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between mb-3"
                      onClick={() => handleSelectDoctor(d)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {d.doctor.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">{d.doctor.name}</h3>
                          <p className="text-sm text-muted-foreground">{d.doctor.specialty}</p>
                        </div>
                      </div>
                      {/* Green dot indicator */}
                      {/* Fetch `hasMessageForPatient` from backend to show this */}
                      {/* Example placeholder */}
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
