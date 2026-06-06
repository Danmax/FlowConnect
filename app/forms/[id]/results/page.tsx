import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FormResultsDashboard } from "@/components/forms/FormResultsDashboard";
import { getCurrentUser } from "@/lib/auth";
import { getFormResultsForUser } from "@/lib/forms-repository";

type FormResultsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FormResultsPage({ params }: FormResultsPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;
  const formId = Number(id);

  if (!user || !Number.isInteger(formId)) {
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
