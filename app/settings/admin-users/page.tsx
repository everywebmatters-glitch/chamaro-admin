"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { mockAdminUsers } from "@/lib/mock-data";
import type { AdminUser } from "@/lib/types";

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>(mockAdminUsers);
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);

  const columns: DataTableColumn<AdminUser>[] = [
    { key: "name", header: "Admin", render: (a) => <span className="font-medium text-zinc-900">{a.name}</span> },
    { key: "email", header: "Email", render: (a) => <span className="text-zinc-600">{a.email}</span> },
    { key: "role", header: "Role", render: (a) => <StatusBadge status={a.role} tone="zinc" /> },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      headerClassName: "text-right",
      render: (a) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            aria-label={`Edit ${a.name}`}
            onClick={() => setEditing(a)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Remove ${a.name}`}
            onClick={() => setPendingDelete(a)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Admin Users"
        description="Manage who has access to the Chamaro admin panel."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            Add Admin
          </Button>
        }
      />

      <SettingsTabs />

      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={admins} getRowKey={(a) => a.id} />
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add Admin" : `Edit ${typeof editing === "object" ? editing?.name : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setEditing(null)}>
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Full name" name="adminName" defaultValue={typeof editing === "object" ? editing?.name : ""} />
          <Input label="Email" name="adminEmail" type="email" defaultValue={typeof editing === "object" ? editing?.email : ""} />
          <Select label="Role" name="role" defaultValue="ADMIN">
            <option value="ADMIN">ADMIN</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              defaultChecked={typeof editing === "object" ? editing?.status === "Active" : true}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove admin"
        description={`Are you sure you want to remove "${pendingDelete?.name}" from the admin panel?`}
        confirmLabel="Remove"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          setAdmins((prev) => prev.filter((a) => a.id !== pendingDelete?.id));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
