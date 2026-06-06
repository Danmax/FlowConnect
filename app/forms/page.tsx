import { AppShell } from "@/components/AppShell";
import { IntakeFormBuilder } from "@/components/forms/IntakeFormBuilder";
import { getCurrentUser } from "@/lib/auth";
import { listIntakeFormsForUser } from "@/lib/forms-repository";

export default async function FormsPage() {
  const user = await getCurrentUser();
  const forms = user ? await listIntakeFormsForUser(user.id) : [];

  return (
    <AppShell>
      <IntakeFormBuilder initialForms={forms} />
    </AppShell>
  );
}
