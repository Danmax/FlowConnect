"use client";

import { useState } from "react";
import type { IntakeField } from "@/lib/forms-repository";

const fieldTypes: IntakeField["fieldType"][] = ["text", "email", "number", "textarea", "dropdown", "checkbox", "date"];

export function IntakeFormBuilder() {
  const [name, setName] = useState("New intake form");
  const [description, setDescription] = useState("Collect the data needed to start a workflow.");
  const [successMessage, setSuccessMessage] = useState("Thanks. Your response was submitted.");
  const [fields, setFields] = useState<IntakeField[]>([
    { label: "Email", fieldKey: "email", fieldType: "email", required: true, position: 1 },
    { label: "Message", fieldKey: "message", fieldType: "textarea", required: true, position: 2 }
  ]);
  const [message, setMessage] = useState<string | null>(null);

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
      form?: { slug: string };
      error?: string;
    };

    if (!response.ok || !payload.form) {
      setMessage(payload.error ?? "Form could not be saved.");
      return;
    }

    setMessage(`Form published: /f/${payload.form.slug}`);
  };

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
    </section>
  );
}
