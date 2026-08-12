"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProfileUpdate = {
  fullName: string;
  timezone: string;
  locale: string;
  signature?: string;
  muePersona?: string;
  mueStyleProfile?: string;
  dailyDigestEnabled?: boolean;
};

export async function savePersonalProfile(input: ProfileUpdate) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app");

  // Trim the signature but preserve internal newlines — the user often
  // formats their sig with explicit line breaks (name / role / company).
  const sig = input.signature?.replace(/\s+$/g, "") ?? "";
  const persona = input.muePersona?.trim() ?? "";
  const styleProfile = input.mueStyleProfile?.trim() ?? "";

  await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim() || null,
      timezone: input.timezone || "Europe/Paris",
      locale: input.locale || "fr",
      signature: sig.length ? sig : null,
      mue_persona: persona.length ? persona : null,
      mue_style_profile: styleProfile.length ? styleProfile : null,
      daily_digest_enabled: !!input.dailyDigestEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/app", "layout");
}

/**
 * Fetch just the email signature for the current user. Called by the
 * EmailComposer to auto-prepend it when the user opens a reply draft.
 * Returns an empty string if no signature is configured (so the caller
 * can safely concatenate without null-checks).
 */
export async function getEmailSignature(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";

  const { data } = await supabase
    .from("profiles")
    .select("signature")
    .eq("id", user.id)
    .maybeSingle();

  return (data?.signature as string | null) ?? "";
}

/**
 * Upload an avatar to Supabase Storage under the user's own folder, then
 * persist the public URL on their profile. The form sends raw bytes via
 * FormData; we infer the extension from the content-type.
 */
export async function uploadAvatar(form: FormData): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app");

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Avatar trop lourd (max 2 Mo).");
  }

  const ext = (() => {
    const t = file.type;
    if (t === "image/png") return "png";
    if (t === "image/jpeg") return "jpg";
    if (t === "image/webp") return "webp";
    if (t === "image/gif") return "gif";
    throw new Error("Format non supporté (PNG, JPG, WEBP, GIF uniquement).");
  })();

  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/app", "layout");
  return publicUrl;
}

export async function removeAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app");

  // Best-effort: list & delete the user's folder; ignore failures.
  const { data: list } = await supabase.storage.from("avatars").list(user.id);
  if (list?.length) {
    await supabase.storage.from("avatars").remove(list.map((f) => `${user.id}/${f.name}`));
  }

  await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/app", "layout");
}
