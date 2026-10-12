import { Activity } from "lucide-react";
import { EmptyState, ErrorState, PageLoader } from "@/components/common";
import { useFetch } from "@/lib/useFetch";
import { formatDateTime } from "@/lib/format";

const ROLE_DOT = { patient: "bg-emerald-500", doctor: "bg-teal-600", admin: "bg-blue-700" };

export default function ActivityLog() {
  const { data, loading, error, reload } = useFetch("/admin/activity?limit=100");
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (data.length === 0) return <EmptyState icon={Activity} title="No activity recorded yet" />;
  return (
    <ol className="card-surface divide-y divide-slate-100" data-testid="admin-activity-log">
      {data.map((a) => (
        <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ROLE_DOT[a.actor_role] || "bg-slate-400"}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-800"><span className="font-semibold">{a.actor_name}</span> <span className="text-slate-400">({a.actor_role})</span> · <span className="font-mono text-xs text-teal-700">{a.action}</span></p>
            {a.detail && <p className="truncate text-xs text-slate-500">{a.detail}</p>}
          </div>
          <span className="shrink-0 text-xs text-slate-400">{formatDateTime(a.created_at)}</span>
        </li>
      ))}
    </ol>
  );
}
