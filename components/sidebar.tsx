// ===== React & Next.js =====
import Link from "next/link";

// ===== UI Components =====
import { Button } from "@/components/ui/button";

// ===== Icons =====
import { Calendar, Home, ClipboardList } from "lucide-react";

interface SidebarProps {
  userType: "patient" | "doctor";
}

export default function Sidebar({ userType }: SidebarProps) {
  return (
    <aside className="hidden w-64 border-r bg-muted/40 md:block">
      <nav className="grid gap-2 p-4">
        <Link href={`/${userType}/dashboard`} passHref legacyBehavior>
          <Button variant="ghost" className="w-full justify-start">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>

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
      </nav>
    </aside>
  );
}
