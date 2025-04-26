import NewReadingForm from "./new-reading-form";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function NewReading() {
	const { userId } = await auth();

	if (!userId) {
		redirect("/sign-up");
	}

	return <NewReadingForm />;
}
