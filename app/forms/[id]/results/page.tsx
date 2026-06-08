import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FormResultsDashboard } from "@/components/forms/FormResultsDashboard";
import { getFormResultsForUser } from "@/lib/forms-repository";
import { requireCurrentUser } from "@/lib/require-auth";

type FormResultsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FormResultsPage({ params }: FormResultsPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const formId = Number(id);

  if (!Number.isInteger(formId)) {
    notFound();
  }

  const snapshot = await getFormResultsForUser(formId, user.id);

  if (!snapshot) {
    notFound();
  }

  return (
    <AppShell>
      <FormResultsDashboard snapshot={snapshot} />
    </AppShell>
  );
}
