import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, FileHeart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, PageHeader, PageLoader, Spinner } from "@/components/common";
import AppointmentRow from "@/components/AppointmentRow";
import ConfirmButton from "@/components/ConfirmButton";
import { api, formatError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";

function CompleteDialog({ appt, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await api.patch(`/appointments/${appt.id}/status`, { status: "completed", note: note.trim() || null });
      if (note.trim().length >= 3) {
        await api.post("/records", {
          patient_id: appt.patient_user_id, record_type: "consultation", appointment_id: appt.id,
          title: `Consultation - ${appt.date}`, description: note.trim(),
        });
      }
      toast.success("Appointment marked completed");
      onDone();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={!!appt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-white">
        <DialogHeader><DialogTitle>Complete consultation</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-500">{appt?.patient_name} · {appt?.date} {appt?.time}</p>
        <Label>Consultation notes (saved to the patient's records)</Label>
        <Textarea data-testid="complete-note-input" rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Findings, advice, follow-up..." />
        <Button data-testid="complete-submit-button" disabled={saving} onClick={submit} className="rounded-full bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Spinner className="h-4 w-4" /> : "Mark as completed"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function DoctorAppointments() {
  const { data, loading, error, reload } = useFetch("/appointments/me");
  const [completing, setCompleting] = useState(null);

  const setStatus = async (appt, status) => {
    try {
      await api.patch(`/appointments/${appt.id}/status`, { status });
      toast.success(`Appointment ${status}`);
      reload();
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const tabs = ["pending", "confirmed", "completed", "cancelled"];

  const actions = (a) => (
    <>
      <Link to={`/doctor/patients/${a.patient_user_id}`} data-testid={`view-records-${a.id}`}>
        <Button variant="outline" size="sm" className="rounded-full"><FileHeart className="mr-1.5 h-4 w-4" />Records</Button>
      </Link>
      {a.status === "pending" && <Button size="sm" data-testid={`confirm-appointment-${a.id}`} onClick={() => setStatus(a, "confirmed")} className="rounded-full bg-blue-800 hover:bg-blue-700">Confirm</Button>}
      {a.status === "confirmed" && <Button size="sm" data-testid={`complete-appointment-${a.id}`} onClick={() => setCompleting(a)} className="rounded-full bg-emerald-600 hover:bg-emerald-700">Complete</Button>}
      {["pending", "confirmed"].includes(a.status) && (
        <ConfirmButton testId={`doctor-cancel-appointment-${a.id}`} label="Cancel" title="Cancel this appointment?" description="The patient will see it as cancelled and the slot will be released."
          confirmLabel="Cancel appointment" onConfirm={() => setStatus(a, "cancelled")} className="rounded-full border-red-200 text-red-600 hover:bg-red-50" />
      )}
    </>
  );

  return (
    <>
      <PageHeader eyebrow="Appointment management" title="Your appointments" subtitle="Confirm requests, complete consultations with notes, and open authorized records." />
      <Tabs defaultValue="pending">
        <TabsList className="h-auto flex-wrap bg-slate-100">
          {tabs.map((t) => <TabsTrigger key={t} value={t} data-testid={`doctor-tab-${t}`} className="capitalize">{t} ({data.filter((a) => a.status === t).length})</TabsTrigger>)}
        </TabsList>
        {tabs.map((t) => {
          const list = data.filter((a) => a.status === t);
          return (
            <TabsContent key={t} value={t} className="mt-5 space-y-3">
              {list.length === 0 ? <EmptyState icon={CalendarClock} title={`No ${t} appointments`} /> :
                list.map((a) => <AppointmentRow key={a.id} appt={a} viewer="doctor" actions={actions(a)} />)}
            </TabsContent>
          );
        })}
      </Tabs>
      <CompleteDialog appt={completing} onClose={() => setCompleting(null)} onDone={() => { setCompleting(null); reload(); }} />
    </>
  );
}
