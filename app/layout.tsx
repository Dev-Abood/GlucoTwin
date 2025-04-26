/* 
TODO: 
Define the layout by obtaining all the children (the entire page) and wire up with theme provider and auth provider 
TODO: 
Alongside with defining metadata and basic information 
*/
import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {
	ClerkProvider,
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
} from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Toaster } from "@/components/ui/toaster";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

//* Load the Inter Google font
const inter = Inter({ subsets: ["latin"] });

//! Default metadata for Search engine optimization //? Not really necessary
export const metadata: Metadata = {
	title: "GlucoTwin - Gestational Diabetes Monitoring",
	description:
		"Monitor and manage gestational diabetes with digital twin technology",
};

//! Decision will be taken depending on the context of the app that we will pick.
//TODO: Two ways are correct

//! Wrap all the content inside the theme providers & our auth provider so that we can have authentication login ins
export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	//* children: everything nested inside the component, it is all our application nested below
	//* Readonly: the type of the children is a ReactNode, and it is immutable

	//! Authentication checkup
	const { userId } = await auth();
	const userInfo  = await currentUser()
	console.log(userInfo)


	if (userId) {
		try {
			// The issue might be that the x-pathname header is not being set correctly
			// Let's try a different approach by checking the URL directly
			const headersList = headers();
			const referer = headersList.get("referer") || "";
			const url =
				headersList.get("x-url") || headersList.get("x-invoke-path") || referer;

			console.log("Current URL or path:", url); // For debugging

			// Check if we're on the onboarding page by looking at the URL
			const isOnboardingPage = url.includes("/onboarding");

			console.log("Is onboarding page:", isOnboardingPage); // For debugging

			// Only check for user record and redirect if we're not on the onboarding page
			if (!isOnboardingPage) {
				const user = await prisma.patient.findUnique({
					where: {
						id: userId,
					},
				});
				
				// boolean
				console.log("User found:", !!user); // For debugging

				if (!user) {
					console.log("Redirecting to onboarding"); // For debugging
					return redirect("/onboarding");
				}
			}
		} catch (error) {
			console.error("Error in authentication check:", error);
		}
	}

	return (
		<ClerkProvider>
			<html lang="en">
				<body className={inter.className}>
					{/* our font class name */}
					{/* Component from next.js to manage light and dark modes
        Edits the class attribute of the jsx elements, defaults the theme to light,
        allows to match user's OS preference theme, prevents transition animation */}
					<Toaster />
					<ThemeProvider
						attribute="class"
						defaultTheme="light"
						enableSystem
						disableTransitionOnChange
					>
						{children}
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
