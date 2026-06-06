import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export type IntakeFieldType = "text" | "email" | "number" | "textarea" | "dropdown" | "checkbox" | "date";

export type IntakeField = {
  id?: number;
  label: string;
  fieldKey: string;
  fieldType: IntakeFieldType;
  required: boolean;
  hashPii?: boolean;
  options?: string[];
  position: number;
};

export type IntakeForm = {
  id: number;
  userId: number;
  name: string;
  slug: string;
  description: string;
  successMessage: string;
  headerImageUrl: string;
  theme: "blue" | "emerald" | "rose" | "slate" | "amber";
  fontStyle: "system" | "serif" | "mono" | "rounded";
  sharePrivacy: "private" | "team" | "public";
  piiSharingMode: "hash" | "exclude";
  status: "draft" | "published" | "disabled";
  fields: IntakeField[];
};

export type FormSubmissionResult = {
  id: number;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type FormResultsSnapshot = {
  form: IntakeForm;
  submissions: FormSubmissionResult[];
  totalSubmissions: number;
  submissionsByDay: Array<{ label: string; count: number }>;
  fieldBreakdowns: Array<{ fieldKey: string; label: string; values: Array<{ label: string; count: number }> }>;
};

type FormRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  description: string | null;
  success_message: string;
  header_image_url: string | null;
  theme: IntakeForm["theme"] | null;
  font_style: IntakeForm["fontStyle"] | null;
  share_privacy: IntakeForm["sharePrivacy"] | null;
  pii_sharing_mode: IntakeForm["piiSharingMode"] | null;
  status: IntakeForm["status"];
};

type FieldRow = RowDataPacket & {
  id: number;
  label: string;
  field_key: string;
  field_type: IntakeFieldType;
  is_required: 0 | 1;
  hash_pii: 0 | 1;
  options: string | null;
  position: number;
};

type SubmissionRow = RowDataPacket & {
  id: number;
  payload: string | Record<string, unknown>;
  created_at: Date;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const mapField = (field: FieldRow): IntakeField => ({
  id: field.id,
  label: field.label,
  fieldKey: field.field_key,
  fieldType: field.field_type,
  required: Boolean(field.is_required),
  hashPii: Boolean(field.hash_pii),
  options: field.options ? (JSON.parse(field.options) as string[]) : [],
  position: field.position
});

const loadFields = async (formId: number) => {
  const [rows] = await db().execute<FieldRow[]>(
    `SELECT id, label, field_key, field_type, is_required, hash_pii, options, position
     FROM form_fields
     WHERE form_id = :formId
     ORDER BY position ASC`,
    { formId }
  );

  return rows.map(mapField);
};

const mapForm = async (row: FormRow): Promise<IntakeForm> => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? "",
  successMessage: row.success_message,
  headerImageUrl: row.header_image_url ?? "",
  theme: row.theme ?? "blue",
  fontStyle: row.font_style ?? "system",
  sharePrivacy: row.share_privacy ?? "private",
  piiSharingMode: row.pii_sharing_mode ?? "hash",
  status: row.status,
  fields: await loadFields(row.id)
});

const hashPiiValue = (value: unknown) =>
  `sha256:${createHash("sha256").update(String(value ?? "")).digest("hex")}`;

const hashPayloadPii = (form: IntakeForm, payload: Record<string, unknown>) => {
  const nextPayload = { ...payload };

  for (const field of form.fields) {
    if (field.hashPii && nextPayload[field.fieldKey] !== undefined && nextPayload[field.fieldKey] !== null) {
      nextPayload[field.fieldKey] = hashPiiValue(nextPayload[field.fieldKey]);
    }
  }

  return nextPayload;
};

export const preparePayloadForSharing = (
  form: IntakeForm,
  payload: Record<string, unknown>,
  mode: IntakeForm["piiSharingMode"] = form.piiSharingMode
) => {
  const nextPayload = { ...payload };

  for (const field of form.fields) {
    if (!field.hashPii) {
      continue;
    }

    if (mode === "exclude") {
      delete nextPayload[field.fieldKey];
    } else if (nextPayload[field.fieldKey] !== undefined && nextPayload[field.fieldKey] !== null) {
      const value = String(nextPayload[field.fieldKey]);
      nextPayload[field.fieldKey] = value.startsWith("sha256:") ? value : hashPiiValue(value);
    }
  }

  return nextPayload;
};

export const createIntakeFormForUser = async ({
  userId,
  name,
  description,
  successMessage,
  headerImageUrl,
  theme,
  fontStyle,
  fields
}: {
  userId: number;
  name: string;
  description: string;
  successMessage: string;
  headerImageUrl: string;
  theme: IntakeForm["theme"];
  fontStyle: IntakeForm["fontStyle"];
  fields: IntakeField[];
}) => {
  const connection = await db().getConnection();
  const slug = `${slugify(name)}-${Date.now().toString(36)}`;

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO forms (user_id, name, slug, description, success_message, header_image_url, theme, font_style, status)
       VALUES (:userId, :name, :slug, :description, :successMessage, :headerImageUrl, :theme, :fontStyle, 'published')`,
      { userId, name, slug, description, successMessage, headerImageUrl, theme, fontStyle }
    );
    const formId = result.insertId;

    for (const [index, field] of fields.entries()) {
      await connection.execute(
        `INSERT INTO form_fields (form_id, label, field_key, field_type, is_required, hash_pii, options, position)
         VALUES (:formId, :label, :fieldKey, :fieldType, :isRequired, :hashPii, :options, :position)`,
        {
          formId,
          label: field.label,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          isRequired: field.required ? 1 : 0,
          hashPii: field.hashPii ? 1 : 0,
          options: JSON.stringify(field.options ?? []),
          position: index + 1
        }
      );
    }

    await connection.commit();

    return getIntakeFormById(formId, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const listIntakeFormsForUser = async (userId: number) => {
  const [rows] = await db().execute<FormRow[]>(
    `SELECT id, user_id, name, slug, description, success_message, header_image_url, theme, font_style, share_privacy, pii_sharing_mode, status
     FROM forms
     WHERE user_id = :userId
     ORDER BY updated_at DESC`,
    { userId }
  );

  return Promise.all(
    rows.map(mapForm)
  );
};

export const getIntakeFormById = async (formId: number, userId: number) => {
  const [rows] = await db().execute<FormRow[]>(
    `SELECT id, user_id, name, slug, description, success_message, header_image_url, theme, font_style, share_privacy, pii_sharing_mode, status
     FROM forms
     WHERE id = :formId AND user_id = :userId
     LIMIT 1`,
    { formId, userId }
  );

  if (!rows[0]) {
    return null;
  }

  return mapForm(rows[0]);
};

export const updateIntakeFormForUser = async ({
  formId,
  userId,
  name,
  description,
  successMessage,
  headerImageUrl,
  theme,
  fontStyle,
  fields
}: {
  formId: number;
  userId: number;
  name: string;
  description: string;
  successMessage: string;
  headerImageUrl: string;
  theme: IntakeForm["theme"];
  fontStyle: IntakeForm["fontStyle"];
  fields: IntakeField[];
}) => {
  const connection = await db().getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE forms
       SET name = :name,
           description = :description,
           success_message = :successMessage,
           header_image_url = :headerImageUrl,
           theme = :theme,
           font_style = :fontStyle
       WHERE id = :formId AND user_id = :userId`,
      { formId, userId, name, description, successMessage, headerImageUrl, theme, fontStyle }
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return null;
    }

    await connection.execute(`DELETE FROM form_fields WHERE form_id = :formId`, { formId });

    for (const [index, field] of fields.entries()) {
      await connection.execute(
        `INSERT INTO form_fields (form_id, label, field_key, field_type, is_required, hash_pii, options, position)
         VALUES (:formId, :label, :fieldKey, :fieldType, :isRequired, :hashPii, :options, :position)`,
        {
          formId,
          label: field.label,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          isRequired: field.required ? 1 : 0,
          hashPii: field.hashPii ? 1 : 0,
          options: JSON.stringify(field.options ?? []),
          position: index + 1
        }
      );
    }

    await connection.commit();

    return getIntakeFormById(formId, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteIntakeFormForUser = async (formId: number, userId: number) => {
  const connection = await db().getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<FormRow[]>(
      `SELECT id, user_id, name, slug, description, success_message, header_image_url, theme, font_style, share_privacy, pii_sharing_mode, status
       FROM forms
       WHERE id = :formId AND user_id = :userId
       LIMIT 1`,
      { formId, userId }
    );

    if (!rows[0]) {
      await connection.rollback();
      return false;
    }

    await connection.execute(`DELETE FROM form_submissions WHERE form_id = :formId`, { formId });
    await connection.execute(`DELETE FROM form_fields WHERE form_id = :formId`, { formId });
    await connection.execute(`DELETE FROM forms WHERE id = :formId AND user_id = :userId`, { formId, userId });

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateFormSharingPrivacyForUser = async ({
  formId,
  userId,
  sharePrivacy,
  piiSharingMode
}: {
  formId: number;
  userId: number;
  sharePrivacy: IntakeForm["sharePrivacy"];
  piiSharingMode: IntakeForm["piiSharingMode"];
}) => {
  const [result] = await db().execute<ResultSetHeader>(
    `UPDATE forms
     SET share_privacy = :sharePrivacy,
         pii_sharing_mode = :piiSharingMode
     WHERE id = :formId AND user_id = :userId`,
    { formId, userId, sharePrivacy, piiSharingMode }
  );

  return result.affectedRows > 0;
};

export const getPublishedIntakeFormBySlug = async (slug: string) => {
  const [rows] = await db().execute<FormRow[]>(
    `SELECT id, user_id, name, slug, description, success_message, header_image_url, theme, font_style, share_privacy, pii_sharing_mode, status
     FROM forms
     WHERE slug = :slug AND status = 'published'
     LIMIT 1`,
    { slug }
  );

  if (!rows[0]) {
    return null;
  }

  return mapForm(rows[0]);
};

export const saveIntakeSubmission = async (
  form: IntakeForm,
  payload: Record<string, unknown>,
  requestMeta: Record<string, unknown>
) => {
  const missingFields = form.fields
    .filter((field) => field.required && !payload[field.fieldKey])
    .map((field) => field.label);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}.`);
  }

  const storedPayload = hashPayloadPii(form, payload);

  const triggerData = {
    trigger: {
      type: "hosted_form_submission",
      formId: form.id,
      formSlug: form.slug,
      submittedAt: new Date().toISOString()
    },
    form: storedPayload
  };

  const [result] = await db().execute<ResultSetHeader>(
    `INSERT INTO form_submissions (form_id, payload, trigger_data, request_meta)
     VALUES (:formId, :payload, :triggerData, :requestMeta)`,
    {
      formId: form.id,
      payload: JSON.stringify(storedPayload),
      triggerData: JSON.stringify(triggerData),
      requestMeta: JSON.stringify(requestMeta)
    }
  );

  return {
    id: result.insertId,
    triggerData
  };
};

export const getFormResultsForUser = async (formId: number, userId: number): Promise<FormResultsSnapshot | null> => {
  const form = await getIntakeFormById(formId, userId);

  if (!form) {
    return null;
  }

  const [rows] = await db().execute<SubmissionRow[]>(
    `SELECT id, payload, created_at
     FROM form_submissions
     WHERE form_id = :formId
     ORDER BY created_at DESC
     LIMIT 200`,
    { formId }
  );

  const submissions = rows.map((row) => ({
    id: row.id,
    payload: typeof row.payload === "string" ? (JSON.parse(row.payload) as Record<string, unknown>) : row.payload,
    createdAt: row.created_at.toISOString()
  }));
  const submissionsByDay = new Map<string, number>();
  const breakdowns = new Map<string, Map<string, number>>();

  for (const field of form.fields) {
    if (["dropdown", "checkbox", "date"].includes(field.fieldType)) {
      breakdowns.set(field.fieldKey, new Map());
    }
  }

  for (const submission of submissions) {
    const day = submission.createdAt.slice(0, 10);
    submissionsByDay.set(day, (submissionsByDay.get(day) ?? 0) + 1);

    for (const [fieldKey, counts] of breakdowns) {
      const value = submission.payload[fieldKey];
      const label = value === undefined || value === null || value === "" ? "Blank" : String(value);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return {
    form,
    submissions,
    totalSubmissions: submissions.length,
    submissionsByDay: Array.from(submissionsByDay, ([label, count]) => ({ label, count })).reverse(),
    fieldBreakdowns: Array.from(breakdowns, ([fieldKey, counts]) => ({
      fieldKey,
      label: form.fields.find((field) => field.fieldKey === fieldKey)?.label ?? fieldKey,
      values: Array.from(counts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8)
    }))
  };
};
