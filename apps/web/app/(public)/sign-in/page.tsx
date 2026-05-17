import { redirect } from "next/navigation";

export const metadata = { title: "Se connecter · Freescale" };

/**
 * Legacy route. The /welcome page now handles both new and returning
 * users via a single unified auth surface. Preserve the URL so old
 * links + email templates still work, just bounce to /welcome.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, v);
  }
  const target = `/welcome${qs.toString() ? `?${qs.toString()}` : ""}`;
  redirect(target as never);
}
