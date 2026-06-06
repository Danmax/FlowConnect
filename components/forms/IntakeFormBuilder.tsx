"use client";

import { useState } from "react";
import type { IntakeField, IntakeForm } from "@/lib/forms-repository";

const fieldTypes: IntakeField["fieldType"][] = ["text", "email", "number", "textarea", "dropdown", "checkbox", "date"];

export function IntakeFormBuilder({ initialForms }: { initialForms: IntakeForm[] }) {
  const [name, setName] = useState("New intake form");
  const [description, setDescription] = useState("Collect the data needed to start a workflow.");
  const [successMessage, setSuccessMessage] = useState("Thanks. Your response was submitted.");
  const [fields, setFields] = useState<IntakeField[]>([
    { label: "Email", fieldKey: "email", fieldType: "email", required: true, position: 1 },
    { label: "Message", fieldKey: "message", fieldType: "textarea", required: true, position: 2 }
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const [forms, setForms] = useState(initialForms);

  const updateField = (index: number, update: Partial<IntakeField>) => {
    setFields((current) => current.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...update } : field)));
  };

  const addField = () => {
    const position = fields.length + 1;
    setFields((current) => [
      ...current,
      {
        label: `Field ${position}`,
        fieldKey: `field_${position}`,
        fieldType: "text",
        required: false,
        position
      }
    ]);
  };

  const saveForm = async () => {
    setMessage("Saving form...");

    const response = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        successMessage,
        fields
      })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      form?: IntakeForm;
      error?: string;
    };

    if (!response.ok || !payload.form) {
      setMessage(payload.error ?? "Form could not be saved.");
      return;
    }

    setForms((current) => [payload.form as IntakeForm, ...current]);
    setMessage(`Form published: /f/${payload.form.slug}`);
  };

  const getPublicUrl = (slug: string) => `${window.location.origin}/f/${slug}`;
  const getEmbedCode = (slug: string) =>
    `<iframe src="${window.location.origin}/embed/forms/${slug}" width="100%" height="720" style="border:0;border-radius:8px;" title="FlowConnect intake form"></iframe>`;

  return (
    <section className="workflow-builder">
      <div className="panel workflow-toolbar">
        <div>
          <span className="badge">Hosted forms</span>
          <h1>Create an intake form trigger</h1>
          <p className="lead">Submissions become workflow trigger data under `form.email`, `form.message`, and your custom fields.</p>
        </div>
        <button className="button primary" onClick={saveForm} type="button">
          Save form
        </button>
      </div>

      <div className="panel connection-form">
        <label>
          <span>Form name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span>Description</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          <span>Success message</span>
          <input value={successMessage} onChange={(event) => setSuccessMessage(event.target.value)} />
        </label>
      </div>

      <section className="grid two">
        {fields.map((field, index) => (
          <article className="card connection-form" key={`${field.fieldKey}-${index}`}>
            <label>
              <span>Label</span>
              <input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} />
            </label>
            <label>
              <span>Field key</span>
              <input value={field.fieldKey} onChange={(event) => updateField(index, { fieldKey: event.target.value })} />
            </label>
            <label>
              <span>Type</span>
              <select value={field.fieldType} onChange={(event) => updateField(index, { fieldType: event.target.value as IntakeField["fieldType"] })}>
                {fieldTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                checked={field.required}
                onChange={(event) => updateField(index, { required: event.target.checked })}
                type="checkbox"
              />
              Required
            </label>
          </article>
        ))}
      </section>

      <button className="button big-button" onClick={addField} type="button">
        Add field
      </button>
      {message ? <p className={message.includes("published") ? "form-success" : "form-error"}>{message}</p> : null}

      <section className="section">
        <h2>Published forms</h2>
        <div className="grid two">
          {forms.length > 0 ? (
            forms.map((form) => (
              <article className="card connection-form" key={form.id}>
                <div>
                  <span className="badge">{form.status}</span>
                  <h3>{form.name}</h3>
                  <p className="muted">{form.description}</p>
                </div>
                <label>
                  <span>Public URL</span>
                  <input readOnly value={getPublicUrl(form.slug)} />
                </label>
                <label>
                  <span>Embed code</span>
                  <textarea readOnly rows={4} value={getEmbedCode(form.slug)} />
                </label>
                <div className="button-row">
                  <a className="button primary" href={`/f/${form.slug}`} target="_blank" rel="noreferrer">
                    Preview
                  </a>
                  <button className="button" onClick={() => navigator.clipboard?.writeText(getPublicUrl(form.slug))} type="button">
                    Copy URL
                  </button>
                  <button className="button" onClick={() => navigator.clipboard?.writeText(getEmbedCode(form.slug))} type="button">
                    Copy embed
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="card">
              <h3>No forms yet</h3>
              <p className="muted">Create and save a form to get a public URL and embed code.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
