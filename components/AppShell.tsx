import Link from "next/link";
import { Workflow } from "lucide-react";

const navItems = [
  ["Dashboard", "/"],
  ["Connectors", "/connectors"],
  ["Usage", "/usage"],
  ["Templates", "/templates"]
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="shell">
      <nav className="nav" aria-label="Primary navigation">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Workflow size={22} aria-hidden="true" />
          </span>
          FlowConnect AI
        </Link>
        <div className="nav-links">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </main>
  );
}
