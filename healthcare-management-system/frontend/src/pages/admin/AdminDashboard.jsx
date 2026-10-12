import { Activity, CalendarCheck, FileHeart, MessageSquare, Stethoscope, Users } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, PageHeader, PageLoader, StatCard } from "@/components/common";
import { useFetch } from "@/lib/useFetch";
import UsersTable from "./UsersTable";
import AdminAppointments from "./AdminAppointments";
import ActivityLog from "./ActivityLog";
import AddDoctorDialog from "./AddDoctorDialog";

const COLORS = { pending: "#F59E0B", confirmed: "#1E40AF", completed: "#10B981", cancelled: "#94A3B8" };

function Overview({ stats }) {
  const chart = Object.entries(stats.appointments_by_status).map(([status, count]) => ({ status, count }));
  return (
    <div className="space-y-6">
      <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Users} label="Patients" value={stats.patients} testId="admin-stat-patients" />
        <StatCard icon={Stethoscope} label="Doctors" value={stats.doctors} tone="teal" testId="admin-stat-doctors" />
        <StatCard icon={CalendarCheck} label="Appointments" value={stats.appointments} tone="mint" testId="admin-stat-appointments" />
        <StatCard icon={FileHeart} label="Medical records" value={stats.medical_records} tone="slate" testId="admin-stat-records" />
        <StatCard icon={MessageSquare} label="AI questions asked" value={stats.ai_conversations} tone="blue" testId="admin-stat-ai" />
        <StatCard icon={Activity} label="Active / disabled accounts" value={`${stats.active_users} / ${stats.disabled_users}`} tone="amber" testId="admin-stat-active" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h3 className="font-heading font-semibold text-slate-900">Appointments by status</h3>
          <div className="mt-4 h-64" data-testid="admin-status-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <XAxis dataKey="status" tickLine={false} axisLine={false} className="text-xs capitalize" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                <Tooltip cursor={{ fill: "#F1F5F9" }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>{chart.map((c) => <Cell key={c.status} fill={COLORS[c.status]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface p-6">
          <h3 className="font-heading font-semibold text-slate-900">Doctors by specialization</h3>
          <ul className="mt-4 space-y-3">
            {Object.entries(stats.doctors_by_specialization).map(([spec, n]) => (
              <li key={spec} className="space-y-1">
                <div className="flex justify-between text-sm"><span className="text-slate-700">{spec}</span><span className="font-semibold">{n}</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${(n / Math.max(stats.doctors, 1)) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const stats = useFetch("/admin/stats");
  if (stats.loading && !stats.data) return <PageLoader />;
  if (stats.error) return <ErrorState message={stats.error} onRetry={stats.reload} />;
  return (
    <>
      <PageHeader eyebrow="Administrator" title="System overview" subtitle="Manage accounts, doctors and appointments. Medical details are intentionally hidden from this console."
        action={<AddDoctorDialog onCreated={stats.reload} />} />
      <Tabs defaultValue="overview">
        <TabsList className="h-auto flex-wrap bg-slate-100">
          {["overview", "patients", "doctors", "appointments", "activity"].map((t) => <TabsTrigger key={t} value={t} data-testid={`admin-tab-${t}`} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview" className="mt-6"><Overview stats={stats.data} /></TabsContent>
        <TabsContent value="patients" className="mt-6"><UsersTable role="patient" onChange={stats.reload} /></TabsContent>
        <TabsContent value="doctors" className="mt-6"><UsersTable role="doctor" onChange={stats.reload} /></TabsContent>
        <TabsContent value="appointments" className="mt-6"><AdminAppointments onChange={stats.reload} /></TabsContent>
        <TabsContent value="activity" className="mt-6"><ActivityLog /></TabsContent>
      </Tabs>
    </>
  );
}
