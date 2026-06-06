"use client";

import { useState } from "react";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (formData: FormData) => {
    setLoading(true);
    setMessage(null);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload =
      mode === "login"
        ? {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? "")
          }
        : {
            firstName: String(formData.get("firstName") ?? ""),
            lastName: String(formData.get("lastName") ?? ""),
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? "")
          };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json()) as { error?: string };

    setLoading(false);

    if (!response.ok) {
      setMessage(result.error ?? "Authentication failed.");
      return;
    }

    window.location.href = "/profile";
  };

  return (
    <form action={submit} className="panel auth-form">
      <span className="badge">{mode === "login" ? "Sign in" : "Create account"}</span>
      <h1>{mode === "login" ? "Welcome back" : "Create your profile"}</h1>
      {mode === "signup" ? (
        <div className="grid two">
          <label>
            <span>First name</span>
            <input name="firstName" required />
          </label>
          <label>
            <span>Last name</span>
            <input name="lastName" required />
          </label>
        </div>
      ) : null}
      <label>
        <span>Email</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>
      <label>
        <span>Password</span>
        <input autoComplete={mode === "login" ? "current-password" : "new-password"} name="password" required type="password" />
      </label>
      <button className="button primary big-button" disabled={loading} type="submit">
        {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </button>
      {message ? <p className="form-error">{message}</p> : null}
    </form>
  );
}
