import { ShieldCheck, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { EmptyState, ErrorState, PageLoader } from "@/components/common";
import { api, formatError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { initials } from "@/lib/format";

function accessNote(d) {
  if (d.override === "granted") return "Access granted by you";
  if (d.override === "revoked") return d.via_appointment ? "Revoked by you - booking does not restore access" : "Access revoked by you";
  return d.via_appointment ? "Access through your appointment" : "No access";
}

export default function DoctorAccessPanel() {
  const { data, loading, error, reload, setData } = useFetch("/access/me");

  const toggle = async (doctor, allowed) => {
    try {
      const res = await api.put(`/access/me/${doctor.id}`, { allowed });
      setData((list) => list.map((d) => (d.id === doctor.id ? res.data : d)));
      toast.success(allowed ? `${doctor.name} can now view your records` : `${doctor.name} can no longer view your records`);
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  return (
    <section data-testid="doctor-access-panel" className="card-surface p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-slate-900">Who can see my records</h2>
          <p className="text-sm text-slate-500">Doctors you book with get access automatically. Use the switches to grant or remove access for any doctor. Your choice always takes priority.</p>
        </div>
      </div>
      <div className="mt-5">
        {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? (
          <EmptyState icon={Stethoscope} title="No doctors available" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((d) => (
              <li key={d.id} data-testid={`access-row-${d.id}`} className="flex items-center gap-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-teal-100 text-sm font-bold text-blue-800">{initials(d.name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{d.name}</p>
                  <p className="truncate text-xs text-slate-500">{d.specialization} · <span data-testid={`access-status-${d.id}`} className={d.has_access ? "text-emerald-700" : "text-slate-400"}>{accessNote(d)}</span></p>
                </div>
                <Switch data-testid={`access-toggle-${d.id}`} checked={d.has_access} onCheckedChange={(v) => toggle(d, v)} aria-label={`Record access for ${d.name}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
