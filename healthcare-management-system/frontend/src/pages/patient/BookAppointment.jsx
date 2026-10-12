import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarX, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, PageHeader, PageLoader, Spinner } from "@/components/common";
import { api, formatError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { DAY_NAMES, initials, todayISO } from "@/lib/format";

function DoctorCard({ doc, selected, onSelect }) {
  return (
    <button type="button" data-testid={`doctor-card-${doc.id}`} onClick={() => onSelect(doc)}
      className={`card-surface w-full p-5 text-left transition-colors duration-200 ${selected ? "border-blue-600 ring-2 ring-blue-100" : "hover:border-slate-300"}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-teal-100 font-bold text-blue-800">{initials(doc.name)}</div>
        <div className="min-w-0">
          <p className="truncate font-heading font-semibold text-slate-900">{doc.name}</p>
          <p className="text-sm text-teal-700">{doc.specialization}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{doc.qualification || "—"} · {doc.experience_years ?? 0} yrs experience</p>
      <p className="mt-1 text-xs text-slate-500">Available: {(doc.available_days || []).map((d) => DAY_NAMES[d]).join(", ")}</p>
    </button>
  );
}

function SlotPicker({ doctorId, date, value, onChange }) {
  const [state, setState] = useState({ loading: true, slots: [], error: null });
  useEffect(() => {
    let active = true;
    setState({ loading: true, slots: [], error: null });
    api.get(`/doctors/${doctorId}/slots`, { params: { date } })
      .then((r) => { if (active) setState({ loading: false, slots: r.data, error: null }); })
      .catch((e) => { if (active) setState({ loading: false, slots: [], error: formatError(e) }); });
    return () => { active = false; };
  }, [doctorId, date]);

  if (state.loading) return <div className="py-6"><Spinner className="h-5 w-5 text-blue-700" /></div>;
  if (state.error) return <p data-testid="slots-error" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{state.error}</p>;
  if (!state.slots.some((s) => s.available)) return <EmptyState icon={CalendarX} title="No open slots" description="Try another date." testId="slots-empty" />;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {state.slots.map((s) => (
        <button key={s.time} type="button" disabled={!s.available} data-testid={`slot-${s.time}`} onClick={() => onChange(s.time)}
          className={`rounded-xl border px-3 py-2 font-mono text-sm transition-colors duration-150 ${
            !s.available ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through"
              : value === s.time ? "border-blue-700 bg-blue-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-700"}`}>
          {s.time}
        </button>
      ))}
    </div>
  );
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const { data: doctors, loading, error, reload } = useFetch("/doctors");
  const [spec, setSpec] = useState("all");
  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const specs = useMemo(() => [...new Set((doctors || []).map((d) => d.specialization).filter(Boolean))], [doctors]);
  const shown = (doctors || []).filter((d) => spec === "all" || d.specialization === spec);

  const book = async () => {
    if (reason.trim().length < 3) return toast.error("Please describe the reason for your visit");
    setSaving(true);
    try {
      await api.post("/appointments", { doctor_id: doctor.id, date, time, reason: reason.trim() });
      toast.success(`Appointment requested with ${doctor.name} on ${date} at ${time}`);
      navigate("/patient/appointments");
    } catch (err) {
      toast.error(formatError(err));
      setTime("");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader eyebrow="Book appointment" title="Find a doctor and pick a slot" subtitle="Booking a doctor allows them to view your records for that consultation."
        action={
          <Select value={spec} onValueChange={setSpec}>
            <SelectTrigger data-testid="specialization-filter" className="w-56 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All specializations</SelectItem>
              {specs.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        } />
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="stagger grid content-start gap-4 sm:grid-cols-2">
          {shown.length === 0 ? <div className="sm:col-span-2"><EmptyState icon={Stethoscope} title="No doctors found" description="No doctors match this specialization." /></div>
            : shown.map((d) => <DoctorCard key={d.id} doc={d} selected={doctor?.id === d.id} onSelect={(x) => { setDoctor(x); setTime(""); }} />)}
        </div>
        <div className="card-surface h-fit space-y-5 p-6 lg:sticky lg:top-24" data-testid="booking-panel">
          {!doctor ? (
            <EmptyState icon={Stethoscope} title="Select a doctor" description="Choose a doctor from the list to see available slots." testId="booking-no-doctor" />
          ) : (
            <>
              <div><p className="text-xs uppercase tracking-wider text-slate-400">Booking with</p><p data-testid="booking-doctor-name" className="font-heading text-lg font-semibold text-slate-900">{doctor.name}</p></div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" min={todayISO()} data-testid="booking-date-input" className="mt-1.5" value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} />
              </div>
              <div><Label>Available slots</Label><div className="mt-2">{date && <SlotPicker doctorId={doctor.id} date={date} value={time} onChange={setTime} />}</div></div>
              <div>
                <Label htmlFor="reason">Reason for visit</Label>
                <Textarea id="reason" data-testid="booking-reason-input" rows={3} maxLength={300} className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your concern" />
              </div>
              <Button data-testid="book-appointment-button" disabled={!time || saving} onClick={book} className="w-full rounded-full bg-blue-800 hover:bg-blue-700">
                {saving ? <Spinner className="h-4 w-4" /> : time ? `Book ${time}` : "Select a slot"}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
