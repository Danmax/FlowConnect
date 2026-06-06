import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <AppShell>
      <section className="auth-layout">
        <AuthForm mode="signup" />
        <div className="panel">
          <h2>Already have a profile?</h2>
          <p className="lead">Sign in to manage your saved connections and workflow templates.</p>
          <Link className="button" href="/login">
            Sign in
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
