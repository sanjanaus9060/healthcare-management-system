import { Link } from "react-router-dom";
import { CalendarCheck, CalendarClock, ClipboardList, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageHeader, PageLoader, StatCard } from "@/components/common";
import AppointmentRow from "@/components/AppointmentRow";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/lib/useFetch";
import { formatDate, isUpcoming, todayISO } from "@/lib/format";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const appts = useFetch("/appointments/me");
  const patients = useFetch("/doctors/me/patients");

  if (appts.loading || patients.loading) return <PageLoader />;
  if (appts.error || patients.error) return <ErrorState message={appts.error || patients.error} onRetry={() => { appts.reload(); patients.reload(); }} />;

  const today = todayISO();
  const upcoming = appts.data.filter(isUpcoming).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const todays = upcoming.filter((a) => a.date === today);
  const pending = appts.data.filter((a) => a.status === "pending");

  return (
    <>
      <PageHeader eyebrow="Doctor dashboard" title={`Good day, ${user.name}`} subtitle={`${user.specialization || "Doctor"} · Manage consultations and authorized patient records.`}
        action={<Link to="/doctor/appointments" data-testid="doctor-manage-appointments-button"><Button className="rounded-full bg-blue-800 hover:bg-blue-700">Manage appointments</Button></Link>} />
      <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarClock} label="Today" value={todays.length} testId="doctor-stat-today" />
        <StatCard icon={ClipboardList} label="Pending requests" value={pending.length} tone="amber" testId="doctor-stat-pending" />
        <StatCard icon={CalendarCheck} label="Upcoming" value={upcoming.length} tone="teal" testId="doctor-stat-upcoming" />
        <StatCard icon={Users} label="Authorized patients" value={patients.data.length} tone="mint" testId="doctor-stat-patients" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Next appointments</h2>
          {upcoming.length === 0 ? <EmptyState icon={CalendarClock} title="No upcoming appointments" /> :
            upcoming.slice(0, 5).map((a) => <AppointmentRow key={a.id} appt={a} viewer="doctor" />)}
        </section>
        <aside className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-slate-900">My patients</h2>
          {patients.data.length === 0 ? <EmptyState icon={Users} title="No patients yet" description="Patients appear after they book with you." /> : (
            <div className="card-surface divide-y divide-slate-100" data-testid="doctor-patient-list">
              {patients.data.map((p) => (
                <Link key={p.patient_user_id} to={`/doctor/patients/${p.patient_user_id}`} data-testid={`doctor-patient-${p.patient_user_id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50">
                  <div><p className="font-semibold text-slate-800">{p.patient_name}</p><p className="font-mono text-xs text-slate-500">{p.patient_code}</p></div>
                  <span className="text-xs text-slate-400">Last: {formatDate(p.last_visit)}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
