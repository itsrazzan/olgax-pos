"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function createUser(data: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  const name = data.get("name") as string;
  const email = data.get("email") as string;
  const password = data.get("password") as string;
  const role = data.get("role") as string;

  if (!name || !email || !password || !role) {
    return { error: "Missing required fields" };
  }

  try {
    // Admin plugin is required to use admin.createUser
    // If we get typing issues, we can cast or ignore since it exists dynamically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (auth.api as any).adminCreateUser({
      body: { name, email, password, role },
      headers: await headers(),
    });

    if (!result || result.error) {
      return { error: result?.error?.message ?? "Failed to create user" };
    }
    
    // In case Better Auth ignores the role via adminCreateUser, we ensure it's set in the DB
    if (result.user?.id) {
      await prisma.user.update({
        where: { id: result.user.id },
        data: { role: role as any },
      });
    }

    revalidatePath("/settings/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message ?? "An error occurred" };
  }
}

export async function updateUserRole(userId: string, role: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }
  
  if (session.user.id === userId) {
    return { error: "You cannot change your own role" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });
    revalidatePath("/settings/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message ?? "An error occurred" };
  }
}

export async function deleteUser(userId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  if (session.user.id === userId) {
    return { error: "You cannot delete your own account" };
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    revalidatePath("/settings/users");
    return { success: true };
  } catch (err: any) {
    return { error: err.message ?? "An error occurred" };
  }
}
