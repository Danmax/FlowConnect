"use client";

import { useMemo, useState } from "react";
import type { ConnectorDefinition } from "@/lib/connector-sdk";
import { BrandIcon } from "@/components/BrandIcon";
import type { WorkflowProposal } from "@/lib/ai-workflow-proposal";

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
  const [proposalPrompt, setProposalPrompt] = useState("");
  const [proposalConnectorId, setProposalConnectorId] = useState(connectors[0]?.id ?? "");
  const [proposal, setProposal] = useState<WorkflowProposal | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);

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

  const generateProposal = async () => {
    setProposalLoading(true);
    setMessage(null);

    const response = await fetch("/api/ai/workflow-proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connectorId: proposalConnectorId,
        prompt: proposalPrompt
      })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      proposal?: WorkflowProposal;
      error?: string;
    };

    setProposalLoading(false);

    if (!response.ok || !payload.proposal) {
      setMessage(payload.error ?? "AI proposal could not be created.");
      return;
    }

    setProposal(payload.proposal);
    setMessage("AI workflow proposal ready.");
  };

  const applyProposal = () => {
    if (!proposal) {
      return;
    }

    setWorkflowName(proposal.title);
    setSteps(
      proposal.steps.map((step) => ({
        id: step.id,
        type: step.type,
        name: step.name,
        connectorId: step.connectorId,
        action: step.action,
        inputBindings: step.inputBindings ?? {},
        outputFields: step.outputFields ?? []
      }))
    );
    setMessage("Proposal applied to the builder.");
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

      <section className="panel ai-proposal-panel">
        <div>
          <span className="badge">AI proposal</span>
          <h2>Prompt a connection into a dev workflow</h2>
          <p className="muted">Describe the async API flow you want. The proposal will include steps, actions, data pills, and dot-walk mappings.</p>
        </div>
        <div className="grid two">
          <label>
            <span>Connection app</span>
            <select value={proposalConnectorId} onChange={(event) => setProposalConnectorId(event.target.value)}>
              {connectors.map((connector) => (
                <option key={connector.id} value={connector.id}>
                  {connector.appName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Prompt</span>
            <input
              placeholder="Example: Create incidents from intake forms, summarize them, and send the result to ServiceNow."
              value={proposalPrompt}
              onChange={(event) => setProposalPrompt(event.target.value)}
            />
          </label>
        </div>
        <button className="button primary big-button" disabled={proposalLoading || !proposalPrompt.trim()} onClick={generateProposal} type="button">
          {proposalLoading ? "Generating proposal..." : "Generate AI workflow proposal"}
        </button>
        {proposal ? (
          <div className="proposal-result">
            <div>
              <h3>{proposal.title}</h3>
              <p className="muted">{proposal.summary}</p>
            </div>
            <div className="grid two">
              <article className="card">
                <strong>Assumptions</strong>
                {proposal.assumptions.map((assumption) => (
                  <p key={assumption}>{assumption}</p>
                ))}
              </article>
              <article className="card">
                <strong>Data pills</strong>
                {proposal.dataPills.map((pill) => (
                  <code key={pill}>{"{{"}{pill}{"}}"}</code>
                ))}
              </article>
            </div>
            <label>
              <span>Async Function style proposal</span>
              <textarea readOnly rows={8} value={proposal.asyncFunction} />
            </label>
            <button className="button" onClick={applyProposal} type="button">
              Use proposal in builder
            </button>
          </div>
        ) : null}
      </section>

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
