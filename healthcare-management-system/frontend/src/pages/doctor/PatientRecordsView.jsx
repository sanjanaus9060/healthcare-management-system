import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, ShieldX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState, ErrorState, PageHeader, PageLoader, Spinner } from "@/components/common";
import RecordList, { ChipList } from "@/components/RecordList";
import UploadDocumentDialog from "@/components/UploadDocumentDialog";
import { api, formatError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { emptyToNull, formatDate } from "@/lib/format";

const BLANK_MED = { name: "", dosage: "", frequency: "", duration: "" };
const BLANK = { record_type: "consultation", title: "", description: "", diagnosis: "", medications: [] };

function AddRecordDialog({ patientId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const setMed = (i, k, v) => setForm({ ...form, medications: form.medications.map((m, j) => (j === i ? { ...m, [k]: v } : m)) });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/records", {
        patient_id: patientId, record_type: form.record_type, title: form.title.trim(),
        description: emptyToNull(form.description), diagnosis: emptyToNull(form.diagnosis),
        medications: form.medications.filter((m) => m.name.trim()),
      });
      toast.success("Record added to patient file");
      setForm(BLANK);
      setOpen(false);
      onAdded();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button data-testid="add-record-button" className="rounded-full bg-blue-800 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" />Add record</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-2xl">
        <DialogHeader><DialogTitle>Add clinical record</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4" data-testid="add-record-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Record type</Label>
              <Select value={form.record_type} onValueChange={(v) => setForm({ ...form, record_type: v, medications: v === "prescription" && !form.medications.length ? [{ ...BLANK_MED }] : form.medications })}>
                <SelectTrigger data-testid="record-type-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["consultation", "prescription", "diagnosis"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Title</Label><Input required minLength={3} data-testid="record-title-input" className="mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          </div>
          {form.record_type === "diagnosis" && (
            <div><Label>Diagnosis</Label><Input data-testid="record-diagnosis-input" className="mt-1.5" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
          )}
          <div><Label>Notes</Label><Textarea data-testid="record-description-input" rows={3} className="mt-1.5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {form.record_type === "prescription" && (
            <div className="space-y-2">
              <Label>Medications</Label>
              {form.medications.map((m, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                  {["name", "dosage", "frequency", "duration"].map((k) => (
                    <Input key={k} required placeholder={k} data-testid={`med-${i}-${k}`} value={m[k]} onChange={(e) => setMed(i, k, e.target.value)} />
                  ))}
                  <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, medications: form.medications.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4 text-slate-400" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" data-testid="add-medication-button" onClick={() => setForm({ ...form, medications: [...form.medications, { ...BLANK_MED }] })} className="rounded-full">
                <Plus className="mr-1 h-4 w-4" />Add medication
              </Button>
            </div>
          )}
          <Button type="submit" disabled={saving} data-testid="record-submit-button" className="w-full rounded-full bg-blue-800 hover:bg-blue-700">{saving ? <Spinner className="h-4 w-4" /> : "Save record"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PatientRecordsView() {
  const { patientId } = useParams();
  const { data, loading, error, reload } = useFetch(`/records/patient/${patientId}`);
  const back = <Link to="/doctor/appointments" data-testid="back-to-appointments" className="inline-flex items-center text-sm font-semibold text-blue-800"><ArrowLeft className="mr-1 h-4 w-4" />Back to appointments</Link>;

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <>
        {back}
        {error.toLowerCase().includes("not authorized")
          ? <EmptyState icon={ShieldX} title="Access not authorized" description={error} testId="records-access-denied" />
          : <ErrorState message={error} onRetry={reload} />}
      </>
    );
  }
  const p = data.patient;
  return (
    <>
      {back}
      <PageHeader eyebrow="Authorized patient file" title={p.name} subtitle={`Patient ID ${p.patient_id} · Blood group ${p.blood_group || "—"} · DOB ${formatDate(p.date_of_birth)}`}
        action={<div className="flex flex-wrap gap-2"><UploadDocumentDialog patientId={patientId} onAdded={reload} /><AddRecordDialog patientId={patientId} onAdded={reload} /></div>} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card-surface space-y-3 p-6"><h2 className="font-heading font-semibold text-slate-900">Allergies</h2><ChipList items={data.allergies} testId="patient-allergies" /></div>
        <div className="card-surface space-y-3 p-6"><h2 className="font-heading font-semibold text-slate-900">Conditions</h2><ChipList items={data.chronic_conditions} tone="teal" testId="patient-conditions" /></div>
      </div>
      <RecordList records={data.records} />
    </>
  );
}
