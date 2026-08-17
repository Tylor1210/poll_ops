"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

export function Nav({ showContracts }: { showContracts: boolean }) {
	const pathname = usePathname();

	const statusBoardActive = pathname === "/" || pathname.startsWith("/locations");
	const contractsActive = pathname.startsWith("/contracts");

	return (
		<nav className={styles.nav} aria-label="Primary">
			<Link href="/" className={`${styles.link} ${statusBoardActive ? styles.linkActive : ""}`}>
				Status board
			</Link>
			{showContracts && (
				<Link href="/contracts" className={`${styles.link} ${contractsActive ? styles.linkActive : ""}`}>
					Contracts
				</Link>
			)}
		</nav>
	);
}
