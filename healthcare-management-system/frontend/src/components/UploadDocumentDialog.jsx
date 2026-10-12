import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Spinner } from "@/components/common";
import { api, formatError } from "@/lib/api";

const ACCEPT = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_MB = 10;

export default function UploadDocumentDialog({ patientId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const pick = (f) => {
    setError("");
    if (f && !ACCEPT.includes(f.type)) return setError("Only PDF, PNG, JPEG or WEBP files are allowed");
    if (f && f.size > MAX_MB * 1024 * 1024) return setError(`File must be ${MAX_MB} MB or smaller`);
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, 120));
  };

  const reset = () => { setFile(null); setTitle(""); setNotes(""); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Choose a file to upload");
    if (title.trim().length < 3) return setError("Title must be at least 3 characters");
    const body = new FormData();
    body.append("file", file);
    body.append("title", title.trim());
    if (notes.trim()) body.append("description", notes.trim());
    if (patientId) body.append("patient_id", patientId);
    setSaving(true);
    try {
      await api.post("/records/upload", body);
      toast.success("Document uploaded");
      reset();
      setOpen(false);
      onAdded();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button data-testid="upload-document-button" variant={patientId ? "outline" : "default"} className={`rounded-full ${patientId ? "" : "bg-blue-800 hover:bg-blue-700"}`}>
          <UploadCloud className="mr-2 h-4 w-4" />Upload document
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader><DialogTitle>Upload a medical document</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4" data-testid="upload-document-form">
          <label htmlFor="doc-file" className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition-colors hover:border-teal-400">
            <UploadCloud className="h-8 w-8 text-teal-600" />
            <span data-testid="upload-selected-file" className="mt-2 text-sm font-semibold text-slate-700">{file ? file.name : "Click to choose a PDF or image"}</span>
            <span className="text-xs text-slate-400">{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `PDF, PNG, JPEG, WEBP - up to ${MAX_MB} MB`}</span>
            <input id="doc-file" type="file" accept={ACCEPT.join(",")} data-testid="upload-file-input" className="sr-only" onChange={(e) => pick(e.target.files?.[0] || null)} />
          </label>
          <div><Label>Title</Label><Input data-testid="upload-title-input" className="mt-1.5" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Blood test report" /></div>
          <div><Label>Notes (optional)</Label><Textarea data-testid="upload-notes-input" className="mt-1.5" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <FieldError message={error} testId="upload-error-message" />
          <Button type="submit" disabled={saving} data-testid="upload-submit-button" className="w-full rounded-full bg-blue-800 hover:bg-blue-700">
            {saving ? <Spinner className="h-4 w-4" /> : "Upload"}
          </Button>
          <p className="text-xs text-slate-400">Files are stored privately and can be opened only by you and doctors you have authorized. Use synthetic documents only.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
