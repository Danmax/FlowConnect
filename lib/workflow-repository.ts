import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import type { WorkflowDraft } from "@/lib/workflow-engine";

export type WorkflowStatus = WorkflowDraft["status"];

export type WorkflowRunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type WorkflowRunSummary = {
  id: number;
  status: WorkflowRunStatus;
  label: "in progress" | "complete" | "error" | "cancelled";
  createdAt: string;
  completedAt: string | null;
  errorDetails: Record<string, unknown> | null;
};

export type WorkflowListItem = {
  id: number;
  name: string;
  status: WorkflowStatus;
  sourceTemplateId: string | null;
  stepCount: number;
  latestRun: WorkflowRunSummary | null;
  createdAt: string;
  updatedAt: string;
};

type WorkflowRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  status: WorkflowStatus;
  source_template_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type WorkflowListRow = WorkflowRow & {
  step_count: number;
  latest_run_id: number | null;
  latest_run_status: WorkflowRunStatus | null;
  latest_run_created_at: Date | null;
  latest_run_completed_at: Date | null;
  latest_run_error_details: string | Record<string, unknown> | null;
};

type WorkflowVersionRow = RowDataPacket & {
  definition: string | WorkflowDraft;
  name: string;
  status: WorkflowStatus;
  source_template_id: string | null;
};

type WorkflowRunRow = RowDataPacket & {
  id: number;
  status: WorkflowRunStatus;
  created_at: Date;
  completed_at: Date | null;
  error_details: string | Record<string, unknown> | null;
};

const parseJson = <T>(value: string | T | null): T | null => {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? (JSON.parse(value) as T) : value;
};

const mapRunStatusLabel = (status: WorkflowRunStatus): WorkflowRunSummary["label"] => {
  if (status === "pending" || status === "running") {
    return "in progress";
  }

  if (status === "completed") {
    return "complete";
  }

  if (status === "failed") {
    return "error";
  }

  return "cancelled";
};

const mapRunSummary = (row: WorkflowRunRow): WorkflowRunSummary => ({
  id: row.id,
  status: row.status,
  label: mapRunStatusLabel(row.status),
  createdAt: row.created_at.toISOString(),
  completedAt: row.completed_at?.toISOString() ?? null,
  errorDetails: parseJson<Record<string, unknown>>(row.error_details)
});

export const saveWorkflowDraftForUser = async (workflow: WorkflowDraft) => {
  const connection = await db().getConnection();

  try {
    await connection.beginTransaction();
    let workflowId = workflow.databaseId;

    if (workflowId) {
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE workflows
         SET name = :name,
             status = :status,
             source_template_id = :sourceTemplateId
         WHERE id = :workflowId AND user_id = :userId`,
        {
          workflowId,
          userId: Number(workflow.userId),
          name: workflow.name,
          status: workflow.status,
          sourceTemplateId: workflow.sourceTemplateId ?? null
        }
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return null;
      }

      await connection.execute(`DELETE FROM workflow_steps WHERE workflow_id = :workflowId`, { workflowId });
    } else {
      const [workflowResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workflows (user_id, name, status, source_template_id)
         VALUES (:userId, :name, :status, :sourceTemplateId)`,
        {
          userId: Number(workflow.userId),
          name: workflow.name,
          status: workflow.status,
          sourceTemplateId: workflow.sourceTemplateId ?? null
        }
      );
      workflowId = workflowResult.insertId;
    }

    const [versionRows] = await connection.execute<(RowDataPacket & { next_version: number })[]>(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
       FROM workflow_versions
       WHERE workflow_id = :workflowId`,
      { workflowId }
    );
    const versionNumber = versionRows[0]?.next_version ?? 1;
    const definition = { ...workflow, databaseId: workflowId };

    await connection.execute(
      `INSERT INTO workflow_versions (workflow_id, version_number, definition)
       VALUES (:workflowId, :versionNumber, :definition)`,
      {
        workflowId,
        definition: JSON.stringify(definition),
        versionNumber
      }
    );

    for (const [index, step] of workflow.steps.entries()) {
      await connection.execute(
        `INSERT INTO workflow_steps (workflow_id, step_type, name, position, connector_type_id, action_key, config)
         VALUES (:workflowId, :stepType, :name, :position, :connectorTypeId, :actionKey, :config)`,
        {
          workflowId,
          stepType: step.type,
          name: step.name,
          position: index + 1,
          connectorTypeId: step.connectorId ?? null,
          actionKey: step.action ?? null,
          config: JSON.stringify({
            ...step.config,
            inputBindings: step.inputBindings,
            outputFields: step.outputFields
          })
        }
      );
    }

    await connection.commit();

    return {
      ...workflow,
      databaseId: workflowId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const listWorkflowsForUser = async (userId: number): Promise<WorkflowListItem[]> => {
  const [rows] = await db().execute<WorkflowListRow[]>(
    `SELECT w.id,
            w.user_id,
            w.name,
            w.status,
            w.source_template_id,
            w.created_at,
            w.updated_at,
            COUNT(DISTINCT ws.id) AS step_count,
            wr.id AS latest_run_id,
            wr.status AS latest_run_status,
            wr.created_at AS latest_run_created_at,
            wr.completed_at AS latest_run_completed_at,
            wr.error_details AS latest_run_error_details
     FROM workflows w
     LEFT JOIN workflow_steps ws ON ws.workflow_id = w.id
     LEFT JOIN workflow_runs wr ON wr.id = (
       SELECT id
       FROM workflow_runs
       WHERE workflow_id = w.id
       ORDER BY created_at DESC
       LIMIT 1
     )
     WHERE w.user_id = :userId
     GROUP BY w.id, wr.id
     ORDER BY w.updated_at DESC`,
    { userId }
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    sourceTemplateId: row.source_template_id,
    stepCount: Number(row.step_count),
    latestRun:
      row.latest_run_id && row.latest_run_status && row.latest_run_created_at
        ? {
            id: row.latest_run_id,
            status: row.latest_run_status,
            label: mapRunStatusLabel(row.latest_run_status),
            createdAt: row.latest_run_created_at.toISOString(),
            completedAt: row.latest_run_completed_at?.toISOString() ?? null,
            errorDetails: parseJson<Record<string, unknown>>(row.latest_run_error_details)
          }
        : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  }));
};

export const getWorkflowDraftForUser = async (workflowId: number, userId: number) => {
  const [rows] = await db().execute<WorkflowVersionRow[]>(
    `SELECT wv.definition, w.name, w.status, w.source_template_id
     FROM workflow_versions wv
     INNER JOIN workflows w ON w.id = wv.workflow_id
     WHERE wv.workflow_id = :workflowId AND w.user_id = :userId
     ORDER BY wv.version_number DESC
     LIMIT 1`,
    { workflowId, userId }
  );
  const definition = parseJson<WorkflowDraft>(rows[0]?.definition ?? null);

  return definition && rows[0]
    ? {
        ...definition,
        databaseId: workflowId,
        userId: String(userId),
        name: rows[0].name,
        status: rows[0].status,
        sourceTemplateId: rows[0].source_template_id ?? undefined
      }
    : null;
};

export const updateWorkflowStatusForUser = async ({
  workflowId,
  userId,
  status
}: {
  workflowId: number;
  userId: number;
  status: WorkflowStatus;
}) => {
  const [result] = await db().execute<ResultSetHeader>(
    `UPDATE workflows
     SET status = :status
     WHERE id = :workflowId AND user_id = :userId`,
    { workflowId, userId, status }
  );

  return result.affectedRows > 0;
};

export const listWorkflowRunsForUser = async (workflowId: number, userId: number) => {
  const [rows] = await db().execute<WorkflowRunRow[]>(
    `SELECT wr.id, wr.status, wr.created_at, wr.completed_at, wr.error_details
     FROM workflow_runs wr
     INNER JOIN workflows w ON w.id = wr.workflow_id
     WHERE wr.workflow_id = :workflowId AND w.user_id = :userId
     ORDER BY wr.created_at DESC
     LIMIT 20`,
    { workflowId, userId }
  );

  return rows.map(mapRunSummary);
};
