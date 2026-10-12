import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, PageLoader, StatusBadge } from "@/components/common";
import ConfirmButton from "@/components/ConfirmButton";
import { api, formatError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { formatDate } from "@/lib/format";

export default function AdminAppointments({ onChange }) {
  const { data, loading, error, reload } = useFetch("/admin/appointments");

  const cancel = async (id) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      toast.success("Appointment cancelled");
      reload();
      onChange();
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (data.length === 0) return <EmptyState icon={CalendarClock} title="No appointments yet" />;

  return (
    <div className="card-surface overflow-x-auto" data-testid="admin-appointments-table">
      <Table>
        <TableHeader>
          <TableRow><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {data.map((a) => (
            <TableRow key={a.id} data-testid={`admin-appointment-row-${a.id}`}>
              <TableCell><p className="font-semibold text-slate-800">{a.patient_name}</p><p className="font-mono text-xs text-slate-400">{a.patient_code}</p></TableCell>
              <TableCell><p className="text-slate-800">{a.doctor_name}</p><p className="text-xs text-slate-400">{a.specialization}</p></TableCell>
              <TableCell>{formatDate(a.date)}</TableCell>
              <TableCell className="font-mono">{a.time}</TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
              <TableCell className="text-right">
                {["pending", "confirmed"].includes(a.status) && (
                  <ConfirmButton testId={`admin-cancel-appointment-${a.id}`} label="Cancel" title="Cancel appointment?" description="The slot will be released for other patients."
                    confirmLabel="Cancel appointment" onConfirm={() => cancel(a.id)} className="rounded-full border-red-200 text-red-600 hover:bg-red-50" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
