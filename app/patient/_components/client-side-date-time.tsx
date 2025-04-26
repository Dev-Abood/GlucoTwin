//TODO: Retrieve the client's date & time

"use client"; //! Client component, re-renders and auth and react hooks run here, commands run on browser console.

import { useState, useEffect } from "react";

export default function ClientSideDateTime() {
	const [dateTime, setDateTime] = useState("");

	//! Don't combine the date in one element so that you can use the 'new' keyword
	useEffect(() => {
		// Only set the date on the client side after initial render
		setDateTime(new Date().toLocaleString("en-US", {
			timeZone: "Asia/Dubai",
		}))

		// Update the time every second for a live clock
		const interval = setInterval(() => {
			setDateTime(new Date().toLocaleString("en-US", {
				timeZone: "Asia/Dubai",
			}));
		}, 1000);

		return () => clearInterval(interval); //* Cleanup function
	}, []);

	// Return empty during server rendering and only show time after client hydration
	return <span>{dateTime || "Loading time..."}</span>;
}