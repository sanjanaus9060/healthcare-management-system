import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Bot, CalendarClock, CalendarPlus, CreditCard, FileHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, PageHeader, PageLoader, StatCard, EmptyState } from "@/components/common";
import AppointmentRow from "@/components/AppointmentRow";
import { ChipList } from "@/components/RecordList";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/lib/useFetch";
import { formatDate, isUpcoming } from "@/lib/format";

export default function PatientDashboard() {
  const { user } = useAuth();
  const appts = useFetch("/appointments/me");
  const records = useFetch("/records/me");
  const card = useFetch("/health-card/me");

  if (appts.loading || records.loading || card.loading) return <PageLoader />;
  const err = appts.error || records.error || card.error;
  if (err) return <ErrorState message={err} onRetry={() => { appts.reload(); records.reload(); card.reload(); }} />;

  const upcoming = appts.data.filter(isUpcoming).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const incomplete = !card.data.blood_group || !card.data.emergency_contact;

  return (
    <>
      <PageHeader eyebrow="Patient dashboard" title={`Hello, ${user.name.split(" ")[0]}`} subtitle="Here is a snapshot of your health information and upcoming care."
        action={<Link to="/patient/book" data-testid="dashboard-book-button"><Button className="rounded-full bg-blue-800 hover:bg-blue-700"><CalendarPlus className="mr-2 h-4 w-4" />Book appointment</Button></Link>} />

      {incomplete && (
        <div data-testid="card-incomplete-alert" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="flex-1">Your health card is missing a blood group or emergency contact. Complete it so clinicians have key details in an emergency.</p>
          <Link to="/patient/health-card" data-testid="complete-card-link" className="font-semibold underline">Complete card</Link>
        </div>
      )}

      <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CreditCard} label="Health card ID" value={<span className="font-mono text-lg">{user.patient_id}</span>} testId="stat-card-id" />
        <StatCard icon={CalendarClock} label="Upcoming appointments" value={upcoming.length} tone="teal" testId="stat-upcoming" />
        <StatCard icon={FileHeart} label="Medical records" value={records.data.records.length} tone="mint" testId="stat-records" />
        <StatCard icon={AlertTriangle} label="Known allergies" value={records.data.allergies.length} tone="amber" testId="stat-allergies" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-slate-900">Upcoming appointments</h2>
            <Link to="/patient/appointments" data-testid="dashboard-view-appointments" className="text-sm font-semibold text-blue-800 hover:underline">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No upcoming appointments" description="Book a consultation with one of our specialists."
              action={<Link to="/patient/book"><Button variant="outline" className="rounded-full">Find a doctor</Button></Link>} />
          ) : upcoming.slice(0, 3).map((a) => <AppointmentRow key={a.id} appt={a} />)}

          <h2 className="pt-4 font-heading text-lg font-semibold text-slate-900">Recent records</h2>
          {records.data.records.length === 0 ? (
            <EmptyState icon={FileHeart} title="No records yet" description="Records appear after consultations." />
          ) : (
            <div className="card-surface divide-y divide-slate-100">
              {records.data.records.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                  <div><p className="font-semibold text-slate-800">{r.title}</p><p className="text-xs capitalize text-slate-500">{r.record_type} · {r.author_name}</p></div>
                  <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="card-surface space-y-4 p-6">
            <h3 className="font-heading font-semibold text-slate-900">Allergies</h3>
            <ChipList items={records.data.allergies} testId="dashboard-allergies" />
            <h3 className="font-heading font-semibold text-slate-900">Conditions</h3>
            <ChipList items={records.data.chronic_conditions} tone="teal" testId="dashboard-conditions" />
          </div>
          <Link to="/assistant" data-testid="dashboard-assistant-card" className="block rounded-2xl bg-gradient-to-br from-blue-800 to-teal-700 p-6 text-white transition-transform duration-200 hover:-translate-y-0.5">
            <Bot className="h-7 w-7" />
            <p className="mt-3 font-heading text-lg font-semibold">Ask the AI health assistant</p>
            <p className="mt-1 text-sm text-blue-100">Understand medical terms or prepare for your next visit.</p>
            <span className="mt-4 inline-flex items-center text-sm font-semibold">Start a chat <ArrowRight className="ml-1 h-4 w-4" /></span>
          </Link>
        </aside>
      </div>
    </>
  );
}
