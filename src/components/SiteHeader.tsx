import Link from "next/link";
import { getCurrentRole } from "@/lib/roles";
import { RoleSwitcher } from "@/components/RoleSwitcher";

export async function SiteHeader() {
	const role = await getCurrentRole();

	return (
		<header className="site-header">
			<div className="site-header__titles">
				<Link href="/" className="site-header__brand">
					Poll Ops
				</Link>
				<span className="site-header__tag">Polling place staging &amp; ADA compliance</span>
			</div>
			<RoleSwitcher currentRole={role} />
		</header>
	);
}
