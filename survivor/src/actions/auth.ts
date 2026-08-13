"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { fail, str, type ActionState } from "@/lib/actions";

const signUpSchema = z.object({
  displayName: z.string().min(2, "Enter your name").max(60),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    displayName: str(formData, "displayName"),
    email: str(formData, "email").toLowerCase(),
    password: str(formData, "password"),
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the form and try again");
  }

  const { displayName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail("An account with that email already exists");

  // The very first account, or whoever matches SUPER_ADMIN_EMAIL, becomes the
  // site owner. Everyone after that is an ordinary user.
  const userCount = await prisma.user.count();
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const isSuperAdmin = userCount === 0 || (!!adminEmail && adminEmail === email);

  await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash: await bcrypt.hash(password, 12),
      isSuperAdmin,
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    // signIn throws a redirect on success — only swallow real auth failures.
    if (error instanceof AuthError) {
      return fail("Account created. Please log in.");
    }
    throw error;
  }

  return null;
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");

  if (!email || !password) return fail("Enter your email and password");

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return fail("Incorrect email or password");
    throw error;
  }

  return null;
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
