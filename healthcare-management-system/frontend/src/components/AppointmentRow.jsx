import { CalendarDays, Clock } from "lucide-react";
import { StatusBadge } from "@/components/common";
import { formatDate, initials } from "@/lib/format";

export default function AppointmentRow({ appt, viewer = "patient", actions }) {
  const title = viewer === "patient" ? appt.doctor_name : appt.patient_name;
  const sub = viewer === "patient" ? appt.specialization : `Patient ID ${appt.patient_code || "—"}`;
  return (
    <div data-testid={`appointment-row-${appt.id}`} className="card-surface flex flex-col gap-4 p-5 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-teal-100 font-bold text-blue-800">
          {initials(title)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading font-semibold text-slate-900">{title}</p>
          <p className="truncate text-sm text-slate-500">{sub}</p>
          {appt.reason && <p className="mt-1 line-clamp-1 text-sm text-slate-600">{appt.reason}</p>}
          {appt.doctor_note && <p className="mt-1 text-xs text-teal-700">Doctor note: {appt.doctor_note}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" />{formatDate(appt.date)}</span>
        <span className="inline-flex items-center gap-1.5 font-mono"><Clock className="h-4 w-4 text-slate-400" />{appt.time}</span>
        <StatusBadge status={appt.status} testId={`appointment-status-${appt.id}`} />
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
