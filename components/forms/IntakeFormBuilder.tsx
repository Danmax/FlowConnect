"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { FormProposal } from "@/lib/ai-form-proposal";
import type { IntakeField, IntakeForm } from "@/lib/forms-repository";

const fieldTypes: IntakeField["fieldType"][] = ["text", "email", "number", "textarea", "dropdown", "checkbox", "date"];
const themes: IntakeForm["theme"][] = ["blue", "emerald", "rose", "slate", "amber"];
const fontStyles: IntakeForm["fontStyle"][] = ["system", "serif", "mono", "rounded"];

export function IntakeFormBuilder({ initialForms }: { initialForms: IntakeForm[] }) {
  const [name, setName] = useState("New intake form");
  const [description, setDescription] = useState("Collect the data needed to start a workflow.");
  const [successMessage, setSuccessMessage] = useState("Thanks. Your response was submitted.");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [theme, setTheme] = useState<IntakeForm["theme"]>("blue");
  const [fontStyle, setFontStyle] = useState<IntakeForm["fontStyle"]>("system");
  const [fields, setFields] = useState<IntakeField[]>([
    { label: "Email", fieldKey: "email", fieldType: "email", required: true, hashPii: true, position: 1 },
    { label: "Message", fieldKey: "message", fieldType: "textarea", required: true, hashPii: false, position: 2 }
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const [forms, setForms] = useState(initialForms);
  const [editingFormId, setEditingFormId] = useState<number | null>(null);
  const [formPrompt, setFormPrompt] = useState("");
  const [proposal, setProposal] = useState<FormProposal | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);

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
        hashPii: false,
        position
      }
    ]);
  };

  const removeField = (index: number) => {
    setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index));
  };

  const resetEditor = () => {
    setEditingFormId(null);
    setName("New intake form");
    setDescription("Collect the data needed to start a workflow.");
    setSuccessMessage("Thanks. Your response was submitted.");
    setHeaderImageUrl("");
    setTheme("blue");
    setFontStyle("system");
    setFields([
      { label: "Email", fieldKey: "email", fieldType: "email", required: true, hashPii: true, position: 1 },
      { label: "Message", fieldKey: "message", fieldType: "textarea", required: true, hashPii: false, position: 2 }
    ]);
  };

  const editForm = (form: IntakeForm) => {
    setEditingFormId(form.id);
    setName(form.name);
    setDescription(form.description);
    setSuccessMessage(form.successMessage);
    setHeaderImageUrl(form.headerImageUrl);
    setTheme(form.theme);
    setFontStyle(form.fontStyle);
    setFields(form.fields.map((field, index) => ({ ...field, position: index + 1 })));
    setMessage(`Editing ${form.name}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveForm = async () => {
    setMessage(editingFormId ? "Updating form..." : "Saving form...");

    const response = await fetch(editingFormId ? `/api/forms/${editingFormId}` : "/api/forms", {
      method: editingFormId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        successMessage,
        headerImageUrl,
        theme,
        fontStyle,
        fields
      })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      form?: IntakeForm;
      error?: string;
    };

    if (!response.ok || !payload.form) {
      setMessage(payload.error ?? (editingFormId ? "Form could not be updated." : "Form could not be saved."));
      return;
    }

    setForms((current) =>
      editingFormId
        ? current.map((form) => (form.id === payload.form?.id ? (payload.form as IntakeForm) : form))
        : [payload.form as IntakeForm, ...current]
    );
    setEditingFormId(null);
    setMessage(editingFormId ? `Form updated: /f/${payload.form.slug}` : `Form published: /f/${payload.form.slug}`);
  };

  const deleteForm = async (form: IntakeForm) => {
    const confirmed = window.confirm(`Delete "${form.name}"? This will remove the public form and its submissions.`);

    if (!confirmed) {
      return;
    }

    setMessage(`Deleting ${form.name}...`);

    const response = await fetch(`/api/forms/${form.id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error ?? "Form could not be deleted.");
      return;
    }

    setForms((current) => current.filter((item) => item.id !== form.id));

    if (editingFormId === form.id) {
      resetEditor();
    }

    setMessage("Form deleted.");
  };

  const getPublicUrl = (slug: string) => `${window.location.origin}/f/${slug}`;
  const getQrUrl = (slug: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(getPublicUrl(slug))}`;
  const getEmbedCode = (slug: string) =>
    `<iframe src="${window.location.origin}/embed/forms/${slug}" width="100%" height="720" style="border:0;border-radius:8px;" title="FlowConnect intake form"></iframe>`;
  const getMessageClass = (value: string) =>
    value.includes("could not") || value.includes("required") || value.includes("failed") ? "form-error" : "form-success";

  const generateFormProposal = async () => {
    setProposalLoading(true);
    setMessage(null);

    const response = await fetch("/api/ai/form-proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: formPrompt })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      proposal?: FormProposal;
      error?: string;
    };

    setProposalLoading(false);

    if (!response.ok || !payload.proposal) {
      setMessage(payload.error ?? "Form proposal could not be created.");
      return;
    }

    setProposal(payload.proposal);
    setMessage("AI form proposal ready.");
  };

  const applyProposal = () => {
    if (!proposal) {
      return;
    }

    setName(proposal.name);
    setDescription(proposal.description);
    setSuccessMessage(proposal.successMessage);
    setFields(proposal.fields);
    setEditingFormId(null);
    setMessage("AI form fields applied. Review and save when ready.");
  };

  return (
    <section className="workflow-builder">
      <div className="panel workflow-toolbar">
        <div>
          <span className="badge">Hosted forms</span>
          <h1>{editingFormId ? "Edit intake form trigger" : "Create an intake form trigger"}</h1>
          <p className="lead">Submissions become workflow trigger data under `form.email`, `form.message`, and your custom fields.</p>
        </div>
        <div className="button-row">
          {editingFormId ? (
            <button className="button" onClick={resetEditor} type="button">
              Cancel edit
            </button>
          ) : null}
          <button className="button primary" onClick={saveForm} type="button">
            {editingFormId ? "Update form" : "Save form"}
          </button>
        </div>
      </div>

      <section className="panel ai-proposal-panel">
        <div>
          <span className="badge">AI form builder</span>
          <h2>Prompt the fields you need</h2>
          <p className="muted">Describe the intake form. AI will suggest the form name, fields, field keys, types, and required settings.</p>
        </div>
        <label>
          <span>Prompt</span>
          <textarea
            placeholder="Example: Create a ServiceNow incident intake form with requester email, urgency, short description, category, affected system, and attachments notes."
            value={formPrompt}
            onChange={(event) => setFormPrompt(event.target.value)}
            rows={4}
          />
        </label>
        <button className="button primary big-button" disabled={proposalLoading || !formPrompt.trim()} onClick={generateFormProposal} type="button">
          {proposalLoading ? "Generating fields..." : "Generate form fields"}
        </button>
        {proposal ? (
          <div className="proposal-result">
            <h3>{proposal.name}</h3>
            <p className="muted">{proposal.description}</p>
            <div className="grid two">
              {proposal.fields.map((field) => (
                <article className="card" key={field.fieldKey}>
                  <strong>{field.label}</strong>
                  <p className="muted">
                    {field.fieldKey} | {field.fieldType} | {field.required ? "Required" : "Optional"}
                  </p>
                </article>
              ))}
            </div>
            <button className="button" onClick={applyProposal} type="button">
              Use these fields
            </button>
          </div>
        ) : null}
      </section>

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
        <label>
          <span>Header image URL</span>
          <input placeholder="https://example.com/header.jpg" value={headerImageUrl} onChange={(event) => setHeaderImageUrl(event.target.value)} />
        </label>
        <div className="grid two">
          <label>
            <span>Color theme</span>
            <select value={theme} onChange={(event) => setTheme(event.target.value as IntakeForm["theme"])}>
              {themes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Font style</span>
            <select value={fontStyle} onChange={(event) => setFontStyle(event.target.value as IntakeForm["fontStyle"])}>
              {fontStyles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={`form-preview form-theme-${theme} form-font-${fontStyle}`}>
          {headerImageUrl ? <img alt="" className="form-header-image" src={headerImageUrl} /> : null}
          <h3>{name}</h3>
          <p>{description}</p>
          <button className="button primary" type="button">
            Preview submit button
          </button>
        </div>
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
            <label className="checkbox-label">
              <input
                checked={Boolean(field.hashPii)}
                onChange={(event) => updateField(index, { hashPii: event.target.checked })}
                type="checkbox"
              />
              Hash PII on submit
            </label>
            <button className="button danger" disabled={fields.length === 1} onClick={() => removeField(index)} type="button">
              Remove field
            </button>
          </article>
        ))}
      </section>

      <button className="button big-button" onClick={addField} type="button">
        Add field
      </button>
      {message ? <p className={getMessageClass(message)}>{message}</p> : null}

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
                <div className="qr-share">
                  <img alt={`QR code for ${form.name}`} src={getQrUrl(form.slug)} />
                  <div>
                    <strong>QR code</strong>
                    <p className="muted">Scan to open the public form.</p>
                    <a className="button" href={getQrUrl(form.slug)} target="_blank" rel="noreferrer">
                      Open QR
                    </a>
                  </div>
                </div>
                <label>
                  <span>Embed code</span>
                  <textarea readOnly rows={4} value={getEmbedCode(form.slug)} />
                </label>
                <div className="button-row">
                  <a className="button primary" href={`/f/${form.slug}`} target="_blank" rel="noreferrer">
                    Preview
                  </a>
                  <a className="button" href={`/forms/${form.id}/results`}>
                    Results
                  </a>
                  <button className="button" onClick={() => navigator.clipboard?.writeText(getPublicUrl(form.slug))} type="button">
                    Copy URL
                  </button>
                  <button className="button" onClick={() => navigator.clipboard?.writeText(getEmbedCode(form.slug))} type="button">
                    Copy embed
                  </button>
                  <button className="button" onClick={() => editForm(form)} type="button">
                    Edit
                  </button>
                  <button className="button danger" onClick={() => deleteForm(form)} type="button">
                    Delete
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
