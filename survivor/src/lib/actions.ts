import { randomInt } from "crypto";

/** Shape every server action returns so forms can show inline feedback. */
export type ActionState = {
  error?: string;
  success?: string;
} | null;

export function fail(error: string): ActionState {
  return { error };
}

export function ok(success: string): ActionState {
  return { success };
}

/** Unambiguous alphabet — no O/0, I/1, so codes survive being read aloud. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalStr(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

export function int(formData: FormData, key: string): number | null {
  const value = str(formData, key);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function date(formData: FormData, key: string): Date | null {
  const value = str(formData, key);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
