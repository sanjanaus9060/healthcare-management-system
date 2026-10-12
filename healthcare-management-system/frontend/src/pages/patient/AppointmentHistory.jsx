import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, PageHeader, PageLoader } from "@/components/common";
import AppointmentRow from "@/components/AppointmentRow";
import ConfirmButton from "@/components/ConfirmButton";
import { api, formatError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { isUpcoming } from "@/lib/format";

export default function AppointmentHistory() {
  const { data, loading, error, reload } = useFetch("/appointments/me");

  const cancel = async (id) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      toast.success("Appointment cancelled");
      reload();
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const groups = {
    upcoming: data.filter(isUpcoming).reverse(),
    past: data.filter((a) => a.status === "completed" || (["pending", "confirmed"].includes(a.status) && !isUpcoming(a))),
    cancelled: data.filter((a) => a.status === "cancelled"),
  };

  return (
    <>
      <PageHeader eyebrow="Appointments" title="Appointment history" subtitle="Track upcoming visits, past consultations and cancellations."
        action={<Link to="/patient/book" data-testid="history-book-button"><Button className="rounded-full bg-blue-800 hover:bg-blue-700">Book new</Button></Link>} />
      <Tabs defaultValue="upcoming">
        <TabsList className="bg-slate-100">
          {Object.keys(groups).map((k) => (
            <TabsTrigger key={k} value={k} data-testid={`history-tab-${k}`} className="capitalize">{k} ({groups[k].length})</TabsTrigger>
          ))}
        </TabsList>
        {Object.entries(groups).map(([k, list]) => (
          <TabsContent key={k} value={k} className="mt-5 space-y-3">
            {list.length === 0 ? <EmptyState icon={CalendarClock} title={`No ${k} appointments`} /> : list.map((a) => (
              <AppointmentRow key={a.id} appt={a} actions={k === "upcoming" && (
                <ConfirmButton testId={`cancel-appointment-${a.id}`} label="Cancel" title="Cancel this appointment?"
                  description={`Your ${a.time} slot with ${a.doctor_name} will be released.`} confirmLabel="Cancel appointment"
                  onConfirm={() => cancel(a.id)} className="rounded-full border-red-200 text-red-600 hover:bg-red-50" />
              )} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
