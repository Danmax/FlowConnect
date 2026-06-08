import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { listConnectionsForUser, toSafeConnection } from "@/lib/connection-repository";
import { connectorRegistry } from "@/lib/connector-sdk";
import { requireCurrentUser } from "@/lib/require-auth";

export default async function ProfilePage() {
  const user = await requireCurrentUser();
  const connections = (await listConnectionsForUser(user.id)).map(toSafeConnection);

  return (
    <AppShell>
      <section className="profile-header">
        <div>
          <span className="badge">Profile</span>
          <h1>
            {user.firstName} {user.lastName}
          </h1>
          <p className="lead">{user.email}</p>
        </div>
        <LogoutButton />
      </section>

      <section className="grid three">
        <article className="card">
          <strong>Role</strong>
          <p className="lead">{user.role}</p>
        </article>
        <article className="card">
          <strong>Plan</strong>
          <p className="lead">{user.planId}</p>
        </article>
        <article className="card">
          <strong>Connections</strong>
          <p className="lead">{connections.length}</p>
        </article>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Saved connections</h2>
            <p className="muted">Credentials are encrypted and only shown as health/status metadata here.</p>
          </div>
          <Link className="button primary" href="/connectors">
            Add connection
          </Link>
        </div>
        <div className="grid two">
          {connections.length > 0 ? (
            connections.map((connection) => {
              const connector = connectorRegistry.find((item) => item.id === connection.connectorId);

              return (
                <article className="card" key={connection.id}>
                  <span className="badge">{connector?.appName ?? connection.connectorId}</span>
                  <h3>{connection.displayName}</h3>
                  <p>Status: {connection.status}</p>
                  <p>Health: {connection.healthStatus}</p>
                  <p className="muted">Last checked: {connection.lastCheckedAt ?? "Not tested yet"}</p>
                </article>
              );
            })
          ) : (
            <article className="card">
              <h3>No connections yet</h3>
              <p className="muted">Add Google, YouTube, Instagram, GitHub, Wix, or ServiceNow from the connectors page.</p>
            </article>
          )}
        </div>
      </section>
    </AppShell>
  );
}
