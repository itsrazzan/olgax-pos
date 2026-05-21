import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersTable } from "@/components/settings/users-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "User Management" };

export default async function UsersPage() {
  noStore();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "ADMIN") {
    redirect("/pos");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <Breadcrumb items={[
        { label: "Settings", href: "/settings" },
        { label: "Users & Roles" },
      ]} />
      
      <div className="mt-6">
        <UsersTable users={users} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
