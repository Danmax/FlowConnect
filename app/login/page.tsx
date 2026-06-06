import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <AppShell>
      <section className="auth-layout">
        <AuthForm mode="login" />
        <div className="panel">
          <h2>New to FlowConnect?</h2>
          <p className="lead">Create a profile to save encrypted app connections and build workflows under your account.</p>
          <Link className="button primary" href="/signup">
            Create account
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
