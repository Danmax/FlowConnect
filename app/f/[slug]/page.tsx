import { notFound } from "next/navigation";
import { PublicIntakeForm } from "@/components/forms/PublicIntakeForm";
import { getPublishedIntakeFormBySlug } from "@/lib/forms-repository";

type PublicFormPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params;
  const form = await getPublishedIntakeFormBySlug(slug);

  if (!form) {
    notFound();
  }

  return <PublicIntakeForm form={form} />;
}
