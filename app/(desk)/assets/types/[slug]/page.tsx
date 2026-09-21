import { redirect } from "next/navigation";

export default async function AssetTypeFilterRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/assets?type=${encodeURIComponent(slug)}`);
}
