import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/common";
import { api, formatError } from "@/lib/api";
import { emptyToNull } from "@/lib/format";

const BLANK = { name: "", email: "", password: "", phone: "", specialization: "", qualification: "", experience_years: "0" };

export default function AddDoctorDialog({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/doctors", {
        ...form, phone: emptyToNull(form.phone), qualification: emptyToNull(form.qualification), experience_years: Number(form.experience_years) || 0,
      });
      toast.success(`Doctor account created for ${form.name}`);
      setForm(BLANK);
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (k, label, props = {}) => (
    <div><Label>{label}</Label><Input data-testid={`new-doctor-${k}`} className="mt-1.5" value={form[k]} onChange={set(k)} {...props} /></div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button data-testid="admin-add-doctor-button" className="rounded-full bg-blue-800 hover:bg-blue-700"><UserPlus className="mr-2 h-4 w-4" />Add doctor</Button></DialogTrigger>
      <DialogContent className="bg-white sm:max-w-xl">
        <DialogHeader><DialogTitle>Create doctor account</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4" data-testid="add-doctor-form">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("name", "Full name", { required: true, minLength: 2 })}
            {field("email", "Email", { type: "email", required: true })}
            {field("password", "Temporary password", { type: "password", required: true, minLength: 8 })}
            {field("phone", "Phone (optional)")}
            {field("specialization", "Specialization", { required: true })}
            {field("qualification", "Qualification")}
            {field("experience_years", "Experience (years)", { type: "number", min: 0, max: 60 })}
          </div>
          <p className="text-xs text-slate-500">Default availability: Mon-Fri, 09:00-16:30 in 30-minute slots. The doctor can change days from their profile.</p>
          <Button type="submit" disabled={saving} data-testid="new-doctor-submit" className="w-full rounded-full bg-blue-800 hover:bg-blue-700">{saving ? <Spinner className="h-4 w-4" /> : "Create doctor"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
