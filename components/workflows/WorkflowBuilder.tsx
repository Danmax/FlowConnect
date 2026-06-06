"use client";

import { useMemo, useState } from "react";
import type { ConnectorDefinition } from "@/lib/connector-sdk";
import { BrandIcon } from "@/components/BrandIcon";

type ClientConnector = Omit<ConnectorDefinition, "testConnection" | "refreshToken">;

type BuilderStep = {
  id: string;
  type: "trigger" | "transform" | "ai_action" | "function" | "connector_action" | "rest_api";
  name: string;
  connectorId?: string;
  action?: string;
  inputBindings: Record<string, string>;
  outputFields: string[];
};

const initialSteps: BuilderStep[] = [
  {
    id: "trigger",
    type: "trigger",
    name: "Hosted Form Submission",
    inputBindings: {},
    outputFields: ["form.email", "form.name", "form.message", "form.priority"]
  }
];

const stepTypes = ["trigger", "transform", "ai_action", "function", "connector_action", "rest_api"] as const;

export function WorkflowBuilder({ connectors }: { connectors: ClientConnector[] }) {
  const [workflowName, setWorkflowName] = useState("New FlowConnect workflow");
  const [steps, setSteps] = useState<BuilderStep[]>(initialSteps);
  const [message, setMessage] = useState<string | null>(null);

  const dataPills = useMemo(
    () =>
      steps.flatMap((step) =>
        step.outputFields.map((field) => ({
          label: `${step.name}: ${field}`,
          path: `${step.id}.${field}`
        }))
      ),
    [steps]
  );

  const updateStep = (stepId: string, update: Partial<BuilderStep>) => {
    setSteps((current) => current.map((step) => (step.id === stepId ? { ...step, ...update } : step)));
  };

  const addStep = () => {
    const stepNumber = steps.length + 1;

    setSteps((current) => [
      ...current,
      {
        id: `step${stepNumber}`,
        type: "connector_action",
        name: `Step ${stepNumber}`,
        connectorId: connectors[0]?.id,
        action: connectors[0]?.availableActions[0],
        inputBindings: {
          description: "{{trigger.form.message}}"
        },
        outputFields: ["result.id", "result.status"]
      }
    ]);
  };

  const removeStep = (stepId: string) => {
    if (stepId === "trigger") {
      return;
    }

    setSteps((current) => current.filter((step) => step.id !== stepId));
  };

  const saveWorkflow = async () => {
    setMessage("Saving workflow...");

    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: workflowName,
        status: "draft",
        steps: steps.map((step) => ({
          ...step,
          config: {
            inputBindings: step.inputBindings,
            outputFields: step.outputFields
          }
        }))
      })
    });
    const payload = (await response.json()) as { message?: string; validation?: { errors?: string[] }; error?: string };

    if (!response.ok) {
      setMessage(payload.validation?.errors?.join(" ") ?? payload.error ?? "Workflow could not be saved.");
      return;
    }

    setMessage(payload.message ?? "Workflow saved.");
  };

  return (
    <section className="workflow-builder">
      <div className="panel workflow-toolbar">
        <div>
          <span className="badge">Workflow builder</span>
          <h1>Create a multi-step flow</h1>
          <p className="lead">Use data pills like {"{{trigger.form.email}}"} to dot-walk into outputs from previous steps.</p>
        </div>
        <button className="button primary" onClick={saveWorkflow} type="button">
          Save workflow
        </button>
      </div>

      <div className="panel">
        <label>
          <span>Workflow name</span>
          <input value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} />
        </label>
      </div>

      <div className="workflow-layout">
        <div className="workflow-steps">
          {steps.map((step, index) => {
            const connector = connectors.find((item) => item.id === step.connectorId);

            return (
              <article className="card workflow-step" key={step.id}>
                <div className="step-header">
                  <span className="step-number">{index + 1}</span>
                  <input
                    aria-label="Step name"
                    value={step.name}
                    onChange={(event) => updateStep(step.id, { name: event.target.value })}
                  />
                  <button className="button" disabled={step.id === "trigger"} onClick={() => removeStep(step.id)} type="button">
                    Remove
                  </button>
                </div>

                <div className="grid two">
                  <label>
                    <span>Step type</span>
                    <select
                      value={step.type}
                      onChange={(event) => updateStep(step.id, { type: event.target.value as BuilderStep["type"] })}
                    >
                      {stepTypes.map((type) => (
                        <option key={type} value={type}>
                          {type.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Connector</span>
                    <select
                      value={step.connectorId ?? ""}
                      onChange={(event) => {
                        const nextConnector = connectors.find((item) => item.id === event.target.value);
                        updateStep(step.id, {
                          connectorId: nextConnector?.id,
                          action: nextConnector?.availableActions[0]
                        });
                      }}
                    >
                      <option value="">No connector</option>
                      {connectors.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.appName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {connector ? (
                  <div className="connector-mini">
                    <BrandIcon connector={connector} />
                    <label>
                      <span>Action</span>
                      <select value={step.action ?? ""} onChange={(event) => updateStep(step.id, { action: event.target.value })}>
                        {connector.availableActions.map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                <label>
                  <span>Field mappings with data pills</span>
                  <textarea
                    value={Object.entries(step.inputBindings)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join("\n")}
                    onChange={(event) => {
                      const inputBindings = Object.fromEntries(
                        event.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [key, ...value] = line.split(":");
                            return [key.trim(), value.join(":").trim()];
                          })
                      );
                      updateStep(step.id, { inputBindings });
                    }}
                    rows={4}
                  />
                </label>

                <label>
                  <span>Output fields</span>
                  <input
                    value={step.outputFields.join(", ")}
                    onChange={(event) =>
                      updateStep(step.id, {
                        outputFields: event.target.value
                          .split(",")
                          .map((field) => field.trim())
                          .filter(Boolean)
                      })
                    }
                  />
                </label>
              </article>
            );
          })}

          <button className="button primary big-button" onClick={addStep} type="button">
            Add another step
          </button>
        </div>

        <aside className="panel data-pill-panel">
          <h2>Data pills</h2>
          <p className="muted">Click a pill to copy the token, then paste it into a field mapping.</p>
          {dataPills.map((pill) => (
            <button className="data-pill" key={pill.path} onClick={() => navigator.clipboard?.writeText(`{{${pill.path}}}`)} type="button">
              <span>{pill.label}</span>
              <code>{"{{"}{pill.path}{"}}"}</code>
            </button>
          ))}
        </aside>
      </div>

      {message ? <p className={message.includes("saved") ? "form-success" : "form-error"}>{message}</p> : null}
    </section>
  );
}
