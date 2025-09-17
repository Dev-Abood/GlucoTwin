import Link from "next/link";

// UI Components 
import { Button } from "@/components/ui/button";

// Icons 
import { Calendar, Home, ClipboardList, MessageSquare } from "lucide-react";

interface SidebarProps { // to distingiush user type
  userType: "patient" | "doctor";
}

export default function Sidebar({ userType }: SidebarProps){
  return (
    // Dashboard based on user type
    <aside className="hidden w-64 border-r bg-muted/40 md:block">
      <nav className="grid gap-2 p-4">
        <Link href={`/${userType}/dashboard`} passHref legacyBehavior>
          <Button variant="ghost" className="w-full justify-start">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
    {/* Readings List vs Patients List */}
        {userType === "patient" ? (
          <Link href={`/${userType}/readings`} passHref legacyBehavior>
            <Button variant="ghost" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              Readings
            </Button>
          </Link>
        ) : (
          <Link href={`/${userType}/patients`} passHref legacyBehavior>
            <Button variant="ghost" className="w-full justify-start">
              <ClipboardList className="mr-2 h-4 w-4" />
              Patients
            </Button>
          </Link>
        )}
        
    {/* Patient messages vs Doctor Messages */}
        <Link href={`/${userType}/messages`} passHref legacyBehavior>
          <Button variant="ghost" className="w-full justify-start">
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </Button>
        </Link>
      </nav>
    </aside>
  );
}