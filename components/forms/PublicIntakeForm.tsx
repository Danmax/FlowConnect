"use client";

import { useState } from "react";
import type { IntakeForm } from "@/lib/forms-repository";

export function PublicIntakeForm({ form, embedded = false }: { form: IntakeForm; embedded?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (formData: FormData) => {
    const payload = Object.fromEntries(form.fields.map((field) => [field.fieldKey, formData.get(field.fieldKey)]));
    const response = await fetch(`/api/public/forms/${form.slug}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json().catch(() => ({}))) as { message?: string; error?: string };

    setMessage(response.ok ? result.message ?? form.successMessage : result.error ?? "Submission failed.");
  };

  return (
    <main className={embedded ? "embed-shell" : "shell"}>
      <section className={embedded ? "public-form embedded-public-form" : "panel public-form"}>
        <span className="badge">FlowConnect Intake</span>
        <h1>{form.name}</h1>
        <p className="lead">{form.description}</p>
        <form action={submit} className="connection-form">
          {form.fields.map((field) => (
            <label key={field.fieldKey}>
              <span>{field.label}</span>
              {field.fieldType === "textarea" ? (
                <textarea name={field.fieldKey} required={field.required} />
              ) : (
                <input
                  name={field.fieldKey}
                  required={field.required}
                  type={field.fieldType === "checkbox" ? "checkbox" : field.fieldType}
                />
              )}
            </label>
          ))}
          <button className="button primary big-button" type="submit">
            Submit
          </button>
        </form>
        {message ? <p className={message.includes("failed") || message.includes("Missing") ? "form-error" : "form-success"}>{message}</p> : null}
      </section>
    </main>
  );
}
