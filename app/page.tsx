/*
TODO:
Create the layout of the landing page, link other pages using router
*/

// test
// test 2

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
let svg_path = "http://www.w3.org/2000/svg"; //* Checkmark svg

export default async function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-white border-b">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Link
            href='/'>
            <img
              src="/glucotwin_logo.png"
              alt="glucotwin logo"
              className="rounded-lg object-cover mt-1"
              width={40}
              height={40}
            />
            </Link>
            <span className="text-xl font-bold text-primary">GlucoTwin</span>
          </div>
          {/* //* Navbar
           */}
          <nav className="hidden md:flex gap-6">
            <Link
              href="/"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              About
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-blue-50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Monitoring Gestational Diabetes with Digital Twin Technology
                </h1>
                <p className="text-muted-foreground md:text-xl">
                  GlucoTwin provides a seamless platform for expectant mothers
                  to track glucose levels and for healthcare providers to
                  monitor patient health.
                </p>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/patient/dashboard">
                    <Button>Patient Portal</Button>
                  </Link>
                  <Link href="/doctor/dashboard">
                    <Button variant="outline">
                      Healthcare Provider Portal
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="mx-auto lg:order-last">
                {/* //TODO: Change this svg whenever we get an image. Put it in /public folder
                 */}
                <img
                  src="/preg_women.png"
                  alt="Healthcare monitoring dashboard"
                  className="rounded-lg object-cover shadow-lg"
                  width={500}
                  height={400}
                />
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                  For Patients
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Easy Glucose Tracking
                </h2>
                <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Record your glucose readings quickly and easily. Get insights
                  into your trends and receive timely reminders for testing.
                </p>
                <ul className="grid gap-2">
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/20 p-1">
                      <svg
                        xmlns={svg_path}
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Simple data entry for glucose readings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/20 p-1">
                      <svg
                        xmlns={svg_path}
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Visualize your glucose trends over time</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/20 p-1">
                      <svg
                        xmlns={svg_path}
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Receive alerts for dangerous readings</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                  For Healthcare Providers
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Comprehensive Patient Monitoring
                </h2>
                <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Access patient glucose data in real-time. Monitor trends and
                  receive alerts for concerning patterns.
                </p>
                <ul className="grid gap-2">
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/20 p-1">
                      <svg
                        xmlns={svg_path}
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Dashboard view of all patients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/20 p-1">
                      <svg
                        xmlns={svg_path}
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Detailed individual patient readings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/20 p-1">
                      <svg
                        xmlns={svg_path}
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Priority notifications for at-risk patients</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t bg-muted/40">
        <div className="container flex flex-col gap-4 py-10 md:h-24 md:flex-row md:items-center md:justify-between md:py-0">
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              © 2025 GlucoTwin. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
