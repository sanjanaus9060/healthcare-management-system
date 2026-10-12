import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/common";
import { api, formatError } from "@/lib/api";
import { emptyToNull, splitList, todayISO } from "@/lib/format";

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = [["female", "Female"], ["male", "Male"], ["other", "Other"], ["prefer_not_to_say", "Prefer not to say"]];

function toForm(card) {
  return {
    blood_group: card.blood_group || "", date_of_birth: card.date_of_birth || "", gender: card.gender || "",
    phone: card.phone || "", address: card.address || "",
    ec_name: card.emergency_contact?.name || "", ec_relation: card.emergency_contact?.relation || "", ec_phone: card.emergency_contact?.phone || "",
    allergies: card.allergies.join(", "), chronic_conditions: card.chronic_conditions.join(", "),
  };
}

export default function HealthCardForm({ card, onSaved }) {
  const [form, setForm] = useState(() => toForm(card));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const ecFilled = [form.ec_name, form.ec_relation, form.ec_phone].filter((v) => v.trim()).length;
    if (ecFilled > 0 && ecFilled < 3) return toast.error("Fill in all emergency contact fields or leave them all empty");
    const payload = {
      date_of_birth: emptyToNull(form.date_of_birth), phone: emptyToNull(form.phone), address: emptyToNull(form.address),
      allergies: splitList(form.allergies), chronic_conditions: splitList(form.chronic_conditions),
      emergency_contact: ecFilled === 3 ? { name: form.ec_name.trim(), relation: form.ec_relation.trim(), phone: form.ec_phone.trim() } : null,
    };
    if (form.blood_group) payload.blood_group = form.blood_group;
    if (form.gender) payload.gender = form.gender;
    setSaving(true);
    try {
      const res = await api.put("/health-card/me", payload);
      onSaved(res.data);
      toast.success("Health card updated");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const input = (k, label, props = {}) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} data-testid={`card-form-${k}`} className="mt-1.5" value={form[k]} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} data-testid="health-card-form" className="card-surface space-y-6 p-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-slate-900">Update card details</h2>
        <p className="text-sm text-slate-500">Your name and patient ID are managed in your profile and cannot be changed here.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Blood group</Label>
          <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
            <SelectTrigger data-testid="card-form-blood-group" className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{BLOOD.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {input("date_of_birth", "Date of birth", { type: "date", max: todayISO() })}
        <div>
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
            <SelectTrigger data-testid="card-form-gender" className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{GENDERS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {input("phone", "Phone")}
        {input("address", "Address")}
      </div>
      <fieldset className="space-y-3 rounded-xl bg-slate-50 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">Emergency contact</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {input("ec_name", "Name")}
          {input("ec_relation", "Relation")}
          {input("ec_phone", "Phone")}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="allergies">Allergies (comma separated)</Label>
          <Textarea id="allergies" data-testid="card-form-allergies" className="mt-1.5" rows={2} value={form.allergies} onChange={set("allergies")} placeholder="e.g. Penicillin, Peanuts" />
        </div>
        <div>
          <Label htmlFor="chronic_conditions">Conditions (comma separated)</Label>
          <Textarea id="chronic_conditions" data-testid="card-form-conditions" className="mt-1.5" rows={2} value={form.chronic_conditions} onChange={set("chronic_conditions")} placeholder="e.g. Asthma" />
        </div>
      </div>
      <Button type="submit" disabled={saving} data-testid="card-form-save-button" className="rounded-full bg-teal-700 px-6 hover:bg-teal-600">
        {saving ? <Spinner className="h-4 w-4" /> : "Save changes"}
      </Button>
    </form>
  );
}
