"use client";

import { useState } from "react";
import styles from "./GovBanner.module.css";

function FlagIcon() {
	return (
		<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
			<path d="M4 1v18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
			<path d="M4 2.2h13l-2.6 3.4L17 9H4z" fill="currentColor" />
		</svg>
	);
}

function ChevronIcon({ open }: { open: boolean }) {
	return (
		<svg
			viewBox="0 0 12 8"
			width="12"
			height="8"
			aria-hidden="true"
			focusable="false"
			style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }}
		>
			<path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function CheckCircleIcon() {
	return (
		<svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true" focusable="false">
			<circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="2" />
			<path d="M12 20.5l5.5 5.5L28 14" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function LockIcon() {
	return (
		<svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true" focusable="false">
			<rect x="10" y="18" width="20" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
			<path d="M14 18v-4a6 6 0 0 1 12 0v4" fill="none" stroke="currentColor" strokeWidth="2" />
			<circle cx="20" cy="25" r="2" fill="currentColor" />
		</svg>
	);
}

export function GovBanner() {
	const [open, setOpen] = useState(false);

	return (
		<div className={styles.banner}>
			<div className={styles.bar}>
				<FlagIcon />
				<span>An official website of Fairview&ndash;Millbrook County Elections</span>
				<button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
					Here&apos;s how you know
					<ChevronIcon open={open} />
				</button>
			</div>
			{open && (
				<div className={styles.panel}>
					<div className={styles.panelItem}>
						<CheckCircleIcon />
						<p>
							<strong>Official websites use .gov</strong>
							<br />A <strong>.gov</strong> website belongs to an official government organization in Fairview&ndash;Millbrook
							County.
						</p>
					</div>
					<div className={styles.panelItem}>
						<LockIcon />
						<p>
							<strong>Secure .gov websites use HTTPS</strong>
							<br />A lock icon or <strong>https://</strong> means you&apos;ve safely connected to the .gov website. Share
							sensitive information only on official, secure websites.
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
