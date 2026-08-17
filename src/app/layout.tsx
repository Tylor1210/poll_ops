import type { Metadata } from "next";
import { IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { GovBanner } from "@/components/GovBanner";
import "./globals.css";

const body = Public_Sans({
	variable: "--font-body",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	weight: ["400", "500"],
});

export const metadata: Metadata = {
	title: "Poll Ops",
	description: "Polling place staging & ADA compliance",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={`${body.variable} ${mono.variable}`}>
			<body>
				<GovBanner />
				{children}
			</body>
		</html>
	);
}
