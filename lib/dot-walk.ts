export type DataPill = {
  label: string;
  path: string;
  description?: string;
};

const dotWalkPattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+|\[[0-9]+\])*$/;
const pillPattern = /\{\{\s*([^}]+?)\s*\}\}/g;

export const isValidDotWalkPath = (path: string) => dotWalkPattern.test(path.trim());

export const extractDataPills = (value: unknown) => {
  if (typeof value !== "string") {
    return [];
  }

  return [...value.matchAll(pillPattern)].map((match) => match[1].trim());
};

export const validateDataPillReferences = (value: unknown, availablePaths: Set<string>) => {
  const references = extractDataPills(value);
  const errors: string[] = [];

  references.forEach((reference) => {
    if (!isValidDotWalkPath(reference)) {
      errors.push(`${reference} is not a valid dot-walk path.`);
      return;
    }

    if (!availablePaths.has(reference)) {
      errors.push(`${reference} is not available from previous steps.`);
    }
  });

  return errors;
};

export const createStepOutputPills = (stepId: string, stepName: string, fields: string[]): DataPill[] =>
  fields.map((field) => ({
    label: `${stepName} ${field}`,
    path: `${stepId}.${field}`,
    description: `Output from ${stepName}`
  }));
