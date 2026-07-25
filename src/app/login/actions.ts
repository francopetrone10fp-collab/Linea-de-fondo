"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { syntheticEmail } from "@/lib/auth-email";
import { allowedRoleForName, colorForTeam, slugKey, ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/lib/database.types";

export async function checkNameStatus(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { knownUserExists: null as null | boolean };

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("name, role")
    .ilike("name", trimmed)
    .maybeSingle();

  if (existing) {
    return {
      knownUserExists: true as const,
      existingName: existing.name as string,
      existingRole: existing.role as Role,
    };
  }

  const assigned = allowedRoleForName(trimmed);
  return { knownUserExists: false as const, assignedRole: assigned };
}

async function ensureRefereeRegistered(name: string, profileId: string) {
  const admin = createServiceRoleClient();
  const slug = slugKey(name);
  const { data: existingReferees } = await admin.from("referees").select("id, name");
  const existing = (existingReferees ?? []).find((r: { id: string; name: string }) => slugKey(r.name) === slug);
  let refereeId = existing?.id as string | undefined;

  if (!refereeId) {
    const { data: created, error } = await admin
      .from("referees")
      .insert({ name, color: colorForTeam(name), created_by: profileId })
      .select("id")
      .single();
    if (error) return;
    refereeId = created.id;
  }

  await admin.from("profiles").update({ referee_id: refereeId }).eq("id", profileId);
}

export async function signUp(input: { name: string; role: Role; password: string; password2: string }) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "Poné un nombre." };
  if (input.password.length < 4) return { ok: false as const, error: "La clave debe tener al menos 4 caracteres." };
  if (input.password !== input.password2) return { ok: false as const, error: "Las claves no coinciden." };

  const admin = createServiceRoleClient();

  const { data: already } = await admin.from("profiles").select("id").ilike("name", name).maybeSingle();
  if (already) return { ok: false as const, error: "Ese nombre ya tiene un perfil. Iniciá sesión en cambio." };

  const assigned = allowedRoleForName(name);
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  const noUsersYet = (count ?? 0) === 0;
  const finalRole = assigned || input.role;
  const status = assigned || noUsersYet ? "approved" : "pending";

  const email = syntheticEmail(name);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created?.user) {
    return { ok: false as const, error: "No se pudo crear el perfil, probá de nuevo." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    name,
    role: finalRole,
    status,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false as const, error: "No se pudo crear el perfil, probá de nuevo." };
  }

  if (finalRole === "arbitro") {
    await ensureRefereeRegistered(name, created.user.id);
  }

  if (status === "pending") {
    return { ok: true as const, pending: true as const, roleLabel: ROLE_LABELS[finalRole], name };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: input.password });
  if (signInError) {
    return { ok: false as const, error: "Perfil creado, pero no se pudo iniciar sesión. Probá ingresar de nuevo." };
  }
  redirect("/competitions");
}

export async function signIn(input: { name: string; password: string }) {
  const name = input.name.trim();
  if (!name || !input.password) return { ok: false as const, error: "Completá nombre y clave." };

  const email = syntheticEmail(name);
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: input.password });
  if (signInError) {
    return { ok: false as const, error: "Clave incorrecta." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "No se pudo iniciar sesión." };

  const { data: profile } = await supabase.from("profiles").select("name, role, status").eq("id", user.id).single();
  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false as const, error: "Ese perfil ya no existe." };
  }
  if (profile.status === "pending") {
    await supabase.auth.signOut();
    return {
      ok: true as const,
      pending: true as const,
      roleLabel: ROLE_LABELS[profile.role as Role],
      name: profile.name,
    };
  }

  redirect("/competitions");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
