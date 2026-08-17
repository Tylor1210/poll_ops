import Link from "next/link";

export function SiteHeader() {
	return (
		<header className="site-header">
			<Link href="/" className="site-header__brand">
				Poll Ops
			</Link>
			<span className="site-header__tag">Polling place staging &amp; ADA compliance</span>
		</header>
	);
}
