import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageLoader, Spinner } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { api, formatError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { DAY_NAMES, emptyToNull } from "@/lib/format";

function useSubmit() {
  const [saving, setSaving] = useState(false);
  const run = async (fn, success) => {
    setSaving(true);
    try {
      const out = await fn();
      toast.success(success);
      return out;
    } catch (err) {
      toast.error(formatError(err));
      return null;
    } finally {
      setSaving(false);
    }
  };
  return [saving, run];
}

function AccountForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || "" });
  const [saving, run] = useSubmit();
  const submit = async (e) => {
    e.preventDefault();
    const res = await run(() => api.put("/users/me", { name: form.name.trim(), phone: emptyToNull(form.phone) }), "Profile updated");
    if (res) setUser(res.data);
  };
  return (
    <form onSubmit={submit} className="card-surface space-y-4 p-6" data-testid="profile-form">
      <h2 className="font-heading text-lg font-semibold text-slate-900">Account details</h2>
      <div><Label>Email (cannot be changed)</Label><Input disabled value={user.email} className="mt-1.5" data-testid="profile-email" /></div>
      {user.patient_id && <div><Label>Patient ID</Label><Input disabled value={user.patient_id} className="mt-1.5 font-mono" /></div>}
      <div><Label>Full name</Label><Input required minLength={2} data-testid="profile-name-input" className="mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>Phone</Label><Input data-testid="profile-phone-input" className="mt-1.5" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <Button type="submit" disabled={saving} data-testid="profile-save-button" className="rounded-full bg-blue-800 hover:bg-blue-700">{saving ? <Spinner className="h-4 w-4" /> : "Save profile"}</Button>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [saving, run] = useSubmit();
  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) return toast.error("New passwords do not match");
    const res = await run(() => api.post("/users/me/password", { current_password: form.current_password, new_password: form.new_password }), "Password changed");
    if (res) setForm({ current_password: "", new_password: "", confirm: "" });
  };
  const field = (k, label) => (
    <div><Label>{label}</Label><Input type="password" required data-testid={`password-${k}-input`} className="mt-1.5" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
  );
  return (
    <form onSubmit={submit} className="card-surface space-y-4 p-6" data-testid="password-form">
      <h2 className="font-heading text-lg font-semibold text-slate-900">Change password</h2>
      {field("current_password", "Current password")}
      {field("new_password", "New password (8+ chars, letter and number)")}
      {field("confirm", "Confirm new password")}
      <Button type="submit" disabled={saving} data-testid="password-save-button" variant="outline" className="rounded-full">{saving ? <Spinner className="h-4 w-4" /> : "Update password"}</Button>
    </form>
  );
}

function DoctorForm() {
  const { data, loading, setData } = useFetch("/auth/me");
  const [saving, run] = useSubmit();
  if (loading || !data) return <PageLoader />;
  const set = (k, v) => setData({ ...data, [k]: v });
  const toggleDay = (d) => set("available_days", data.available_days.includes(d) ? data.available_days.filter((x) => x !== d) : [...data.available_days, d]);
  const submit = (e) => {
    e.preventDefault();
    run(() => api.put("/doctors/me", {
      specialization: data.specialization, qualification: emptyToNull(data.qualification || ""),
      experience_years: Number(data.experience_years) || 0, bio: emptyToNull(data.bio || ""), available_days: data.available_days,
    }), "Doctor profile updated");
  };
  return (
    <form onSubmit={submit} className="card-surface space-y-4 p-6 lg:col-span-2" data-testid="doctor-profile-form">
      <h2 className="font-heading text-lg font-semibold text-slate-900">Doctor profile & availability</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><Label>Specialization</Label><Input required data-testid="doctor-specialization-input" className="mt-1.5" value={data.specialization || ""} onChange={(e) => set("specialization", e.target.value)} /></div>
        <div><Label>Qualification</Label><Input data-testid="doctor-qualification-input" className="mt-1.5" value={data.qualification || ""} onChange={(e) => set("qualification", e.target.value)} /></div>
        <div><Label>Experience (years)</Label><Input type="number" min={0} max={60} data-testid="doctor-experience-input" className="mt-1.5" value={data.experience_years ?? 0} onChange={(e) => set("experience_years", e.target.value)} /></div>
      </div>
      <div><Label>Bio</Label><Textarea data-testid="doctor-bio-input" rows={2} className="mt-1.5" value={data.bio || ""} onChange={(e) => set("bio", e.target.value)} /></div>
      <div>
        <Label>Available days</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAY_NAMES.map((name, d) => (
            <button type="button" key={name} data-testid={`doctor-day-${name.toLowerCase()}`} onClick={() => toggleDay(d)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${data.available_days.includes(d) ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{name}</button>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={saving} data-testid="doctor-profile-save-button" className="rounded-full bg-teal-700 hover:bg-teal-600">{saving ? <Spinner className="h-4 w-4" /> : "Save availability"}</Button>
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader eyebrow="Profile & settings" title="Manage your account" subtitle="Update the details you are permitted to change." />
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountForm />
        <PasswordForm />
        {user.role === "doctor" && <DoctorForm />}
      </div>
    </>
  );
}
