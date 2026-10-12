import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, Spinner } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { formatError } from "@/lib/api";
import { emptyToNull } from "@/lib/format";
import AuthShell from "./AuthShell";

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Enter your full name";
  if (!/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(f.email)) e.email = "Enter a valid email address";
  if (f.phone && !/^\+?[0-9][0-9\- ]{6,19}$/.test(f.phone)) e.phone = "Enter a valid phone number";
  if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = "At least 8 characters with a letter and a number";
  if (f.password !== f.confirm) e.confirm = "Passwords do not match";
  return e;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    setError("");
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: emptyToNull(form.phone), password: form.password });
      toast.success("Account created. Your digital health card is ready.");
      navigate("/patient/health-card", { replace: true });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const field = (k, label, type = "text", auto) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} autoComplete={auto} data-testid={`register-${k}-input`} className="mt-1.5 h-11" value={form[k]} onChange={set(k)} />
      <FieldError message={errors[k]} testId={`register-${k}-error`} />
    </div>
  );

  return (
    <AuthShell
      title="Create your patient account"
      subtitle="Doctor accounts are created by the hospital administrator."
      footer={<>Already registered? <Link to="/login" data-testid="register-login-link" className="font-semibold text-blue-800 hover:underline">Log in</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4" data-testid="register-form">
        {field("name", "Full name", "text", "name")}
        {field("email", "Email", "email", "email")}
        {field("phone", "Phone (optional)", "tel", "tel")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("password", "Password", "password", "new-password")}
          {field("confirm", "Confirm password", "password", "new-password")}
        </div>
        {error && <p data-testid="register-error-message" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={loading} data-testid="register-submit-button" className="h-11 w-full rounded-xl bg-blue-800 hover:bg-blue-700">
          {loading ? <Spinner className="h-4 w-4" /> : "Create account"}
        </Button>
        <p className="text-xs text-slate-400">Please use synthetic details only - this is a demonstration system.</p>
      </form>
    </AuthShell>
  );
}
