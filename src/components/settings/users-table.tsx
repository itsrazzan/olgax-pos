"use client";

import { useState } from "react";
import { UserCog, Trash2 } from "lucide-react";
import { updateUserRole, deleteUser } from "@/app/actions/user-actions";
import { toast } from "sonner";
import { UserFormModal } from "./user-form-modal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface UsersTableProps {
  users: User[];
  currentUserId: string;
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  async function handleRoleChange(userId: string, newRole: string) {
    setProcessingId(userId);
    const res = await updateUserRole(userId, newRole);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Role updated successfully");
    }
    setProcessingId(null);
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    setProcessingId(userId);
    const res = await deleteUser(userId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("User deleted successfully");
    }
    setProcessingId(null);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">User Accounts</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Add User
        </button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const isProcessing = processingId === user.id;

              return (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {user.name}
                    {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">You</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={isCurrentUser || isProcessing}
                      className="rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="CASHIER">Cashier</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dateFormatter.format(new Date(user.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={isCurrentUser || isProcessing}
                        className="rounded p-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
