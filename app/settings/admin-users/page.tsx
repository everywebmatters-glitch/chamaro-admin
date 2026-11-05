"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, Plus, ShieldCheck } from "lucide-react";
import { useAdminSession } from "@/components/auth/AuthProvider";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { NoticeBanner, type Notice } from "@/components/ui/NoticeBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError, type PageMeta } from "@/lib/api/client";
import { createAdminUser, listAdminUsers, setAdminUserActive, type ApiAdminUser } from "@/lib/api/admin-users";
import { getSessionToken } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

type Result = { key: string; admins: ApiAdminUser[]; meta?: PageMeta } | { key: string; error: ApiError };

export default function AdminUsersPage() {
  const { admin: currentAdmin, logout } = useAdminSession();
  const [page, setPage] = useState(1);
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });
  const [pendingDeactivation, setPendingDeactivation] = useState<ApiAdminUser | null>(null);
  const [busyAdminId, setBusyAdminId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const queryKey = JSON.stringify({ page, search, reloadCount });
  const isLoading = result?.key !== queryKey;

  useEffect(() => {
    const controller = new AbortController();
    const key = queryKey;
    listAdminUsers(getSessionToken() ?? "", { page, search: search || undefined }, controller.signal)
      .then(({ admins, meta }) => setResult({ key, admins, meta }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't load administrator accounts.");
        if (apiError.status === 401) return logout();
        setResult({ key, error: apiError });
      });
    return () => controller.abort();
  }, [queryKey, page, search, logout]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(draftSearch.trim());
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await createAdminUser(getSessionToken() ?? "", {
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim(),
        password: newAdmin.password,
      });
      setCreateOpen(false);
      setNewAdmin({ name: "", email: "", password: "" });
      setPage(1);
      setSearch("");
      setDraftSearch("");
      setNotice({ tone: "success", text: "Administrator account created." });
      setReloadCount((count) => count + 1);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't create the administrator account.");
      if (apiError.status === 401) return logout();
      setCreateError(apiError.message);
    } finally {
      setCreating(false);
    }
  }

  const changeStatus = useCallback(async (target: ApiAdminUser, isActive: boolean) => {
    setBusyAdminId(target.id);
    setNotice(null);
    try {
      await setAdminUserActive(getSessionToken() ?? "", target.id, isActive);
      setNotice({ tone: "success", text: `Administrator ${isActive ? "activated" : "deactivated"}.` });
      setReloadCount((count) => count + 1);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", "Couldn't update the administrator account.");
      if (apiError.status === 401) return logout();
      setNotice({ tone: "error", text: apiError.message });
    } finally {
      setBusyAdminId(null);
      setPendingDeactivation(null);
    }
  }, [logout]);

  const columns: DataTableColumn<ApiAdminUser>[] = useMemo(
    () => [
      {
        key: "admin",
        header: "Administrator",
        primary: true,
        render: (user) => (
          <div className="min-w-0">
            <p className="font-medium text-zinc-900">{user.name}</p>
            <a className="text-xs text-blue-700 hover:underline" href={`mailto:${user.email}`}>{user.email}</a>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (user) => <StatusBadge status={user.isActive ? "Active" : "Inactive"} />,
      },
      {
        key: "created",
        header: "Created",
        render: (user) => <span className="whitespace-nowrap text-zinc-500">{formatDate(user.createdAt)}</span>,
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        className: "text-right",
        headerClassName: "text-right",
        render: (user) => (
          <div className="flex justify-end">
            {user.id === currentAdmin.id ? (
              <span className="px-2 text-xs text-zinc-400">You</span>
            ) : user.isActive ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={busyAdminId === user.id}
                onClick={() => setPendingDeactivation(user)}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busyAdminId === user.id}
                onClick={() => void changeStatus(user, true)}
              >
                {busyAdminId === user.id ? "Updating..." : "Activate"}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [busyAdminId, changeStatus, currentAdmin.id],
  );

  let content;
  if (isLoading || !result) {
    content = <LoadingState label="Loading administrator accounts..." />;
  } else if ("error" in result) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load administrator accounts"
        description={result.error.message}
        action={<Button variant="secondary" onClick={() => setReloadCount((count) => count + 1)}>Try again</Button>}
      />
    );
  } else if (result.admins.length === 0) {
    content = <EmptyState icon={ShieldCheck} title="No administrators found" description="Create an administrator account to grant access to this panel." />;
  } else {
    content = (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <DataTable columns={columns} data={result.admins} getRowKey={(user) => user.id} />
        <Pagination
          page={page}
          totalPages={result.meta?.totalPages ?? 1}
          totalItems={result.meta?.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Admin Users"
        description="Manage who has access to the Chamaro admin panel."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setCreateError(null); setCreateOpen(true); }}>Add admin</Button>}
      />
      <SettingsTabs />
      {notice && <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />}
      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-sm">
          <Input label="Search administrators" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Name or email" />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {content}

      <Modal
        open={createOpen}
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
        title="Create administrator"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button type="submit" form="create-admin-form" variant="primary" disabled={creating} icon={creating ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
              {creating ? "Creating..." : "Create admin"}
            </Button>
          </>
        }
      >
        <form id="create-admin-form" onSubmit={submitCreate} className="flex flex-col gap-4">
          {createError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>}
          <Input label="Name" name="name" value={newAdmin.name} onChange={(event) => setNewAdmin((current) => ({ ...current, name: event.target.value }))} required maxLength={191} />
          <Input label="Email" name="email" type="email" value={newAdmin.email} onChange={(event) => setNewAdmin((current) => ({ ...current, email: event.target.value }))} required maxLength={191} />
          <Input label="Temporary password" name="password" type="password" value={newAdmin.password} onChange={(event) => setNewAdmin((current) => ({ ...current, password: event.target.value }))} required minLength={8} maxLength={200} hint="Use at least 8 characters. Share it securely; the new admin can change it after signing in." />
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDeactivation !== null}
        title="Deactivate administrator?"
        description={pendingDeactivation ? `${pendingDeactivation.name} will no longer be able to sign in. This can be reversed by activating the account again.` : ""}
        confirmLabel="Deactivate"
        busy={busyAdminId !== null}
        onCancel={() => setPendingDeactivation(null)}
        onConfirm={() => {
          if (pendingDeactivation) void changeStatus(pendingDeactivation, false);
        }}
      />
    </div>
  );
}
