// Fixed-locale formatting for anything rendered in a Server Component.
// Using the runtime's default locale (Intl's implicit behavior) causes a
// hydration mismatch whenever the server and browser locales differ —
// which they do by default (Workers runtime vs. whatever the visitor's
// browser reports) — so every date/number shown in server-rendered markup
// must pin an explicit locale.

export function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function formatNumber(value: number): string {
	return value.toLocaleString("en-US");
}
