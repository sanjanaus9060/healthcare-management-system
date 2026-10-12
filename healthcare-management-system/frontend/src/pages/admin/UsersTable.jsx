import { useState } from "react";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, PageLoader } from "@/components/common";
import ConfirmButton from "@/components/ConfirmButton";
import { api, formatError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { formatDate } from "@/lib/format";

export default function UsersTable({ role, onChange }) {
  const { data, loading, error, reload } = useFetch(`/admin/users?role=${role}`);
  const [q, setQ] = useState("");

  const act = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      reload();
      onChange();
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const list = data.filter((u) => `${u.name} ${u.email} ${u.patient_id || ""} ${u.specialization || ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="card-surface overflow-hidden" data-testid={`admin-${role}-table`}>
      <div className="flex items-center gap-2 border-b border-slate-100 p-4">
        <Search className="h-4 w-4 text-slate-400" />
        <Input data-testid={`admin-${role}-search`} placeholder={`Search ${role}s...`} value={q} onChange={(e) => setQ(e.target.value)} className="border-0 shadow-none focus-visible:ring-0" />
      </div>
      {list.length === 0 ? <div className="p-6"><EmptyState icon={Users} title={`No ${role}s found`} /></div> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead>
                <TableHead>{role === "patient" ? "Patient ID" : "Specialization"}</TableHead>
                <TableHead>Joined</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id} data-testid={`admin-user-row-${u.id}`}>
                  <TableCell className="font-semibold text-slate-800">{u.name}</TableCell>
                  <TableCell className="text-slate-600">{u.email}</TableCell>
                  <TableCell className={role === "patient" ? "font-mono text-xs" : ""}>{role === "patient" ? u.patient_id : u.specialization}</TableCell>
                  <TableCell className="text-slate-500">{formatDate(u.created_at)}</TableCell>
                  <TableCell>
                    <Switch data-testid={`admin-toggle-active-${u.id}`} checked={u.is_active}
                      onCheckedChange={(v) => act(() => api.patch(`/admin/users/${u.id}`, { is_active: v }), v ? "Account enabled" : "Account disabled")} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfirmButton testId={`admin-delete-user-${u.id}`} label="Delete" title={`Delete ${u.name}?`}
                      description="This permanently removes the account and cancels their active appointments." confirmLabel="Delete"
                      onConfirm={() => act(() => api.delete(`/admin/users/${u.id}`), "Account deleted")} className="rounded-full border-red-200 text-red-600 hover:bg-red-50" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
