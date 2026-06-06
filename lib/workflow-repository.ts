import type { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import type { WorkflowDraft } from "@/lib/workflow-engine";

export const saveWorkflowDraftForUser = async (workflow: WorkflowDraft) => {
  const connection = await db().getConnection();

  try {
    await connection.beginTransaction();

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
    const workflowId = workflowResult.insertId;

    await connection.execute(
      `INSERT INTO workflow_versions (workflow_id, version_number, definition)
       VALUES (:workflowId, 1, :definition)`,
      {
        workflowId,
        definition: JSON.stringify(workflow)
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
