import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export type IntakeFieldType = "text" | "email" | "number" | "textarea" | "dropdown" | "checkbox" | "date";

export type IntakeField = {
  id?: number;
  label: string;
  fieldKey: string;
  fieldType: IntakeFieldType;
  required: boolean;
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
  status: "draft" | "published" | "disabled";
  fields: IntakeField[];
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
  status: IntakeForm["status"];
};

type FieldRow = RowDataPacket & {
  id: number;
  label: string;
  field_key: string;
  field_type: IntakeFieldType;
  is_required: 0 | 1;
  options: string | null;
  position: number;
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
  options: field.options ? (JSON.parse(field.options) as string[]) : [],
  position: field.position
});

const loadFields = async (formId: number) => {
  const [rows] = await db().execute<FieldRow[]>(
    `SELECT id, label, field_key, field_type, is_required, options, position
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
  status: row.status,
  fields: await loadFields(row.id)
});

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
        `INSERT INTO form_fields (form_id, label, field_key, field_type, is_required, options, position)
         VALUES (:formId, :label, :fieldKey, :fieldType, :isRequired, :options, :position)`,
        {
          formId,
          label: field.label,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          isRequired: field.required ? 1 : 0,
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
    `SELECT id, user_id, name, slug, description, success_message, header_image_url, theme, font_style, status
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
    `SELECT id, user_id, name, slug, description, success_message, header_image_url, theme, font_style, status
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
        `INSERT INTO form_fields (form_id, label, field_key, field_type, is_required, options, position)
         VALUES (:formId, :label, :fieldKey, :fieldType, :isRequired, :options, :position)`,
        {
          formId,
          label: field.label,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          isRequired: field.required ? 1 : 0,
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
      `SELECT id, user_id, name, slug, description, success_message, header_image_url, theme, font_style, status
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

export const getPublishedIntakeFormBySlug = async (slug: string) => {
  const [rows] = await db().execute<FormRow[]>(
    `SELECT id, user_id, name, slug, description, success_message, header_image_url, theme, font_style, status
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

  const triggerData = {
    trigger: {
      type: "hosted_form_submission",
      formId: form.id,
      formSlug: form.slug,
      submittedAt: new Date().toISOString()
    },
    form: payload
  };

  const [result] = await db().execute<ResultSetHeader>(
    `INSERT INTO form_submissions (form_id, payload, trigger_data, request_meta)
     VALUES (:formId, :payload, :triggerData, :requestMeta)`,
    {
      formId: form.id,
      payload: JSON.stringify(payload),
      triggerData: JSON.stringify(triggerData),
      requestMeta: JSON.stringify(requestMeta)
    }
  );

  return {
    id: result.insertId,
    triggerData
  };
};
