import { AppShell } from "@/components/AppShell";
import { IntakeFormBuilder } from "@/components/forms/IntakeFormBuilder";
import { listIntakeFormsForUser } from "@/lib/forms-repository";
import { requireCurrentUser } from "@/lib/require-auth";

export default async function FormsPage() {
  const user = await requireCurrentUser();
  const forms = await listIntakeFormsForUser(user.id);

  return (
    <AppShell>
      <IntakeFormBuilder initialForms={forms} />
    </AppShell>
  );
}
