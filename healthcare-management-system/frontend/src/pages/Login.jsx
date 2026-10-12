import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { formatError } from "@/lib/api";
import { ROLE_HOME } from "@/lib/format";
import AuthShell from "./AuthShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(params.get("expired") ? "Your session expired. Please log in again." : "");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}`);
      const from = location.state?.from;
      navigate(from && from !== "/login" ? from : ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your patient, doctor or administrator portal."
      footer={<>New patient? <Link to="/register" data-testid="login-register-link" className="font-semibold text-blue-800 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" data-testid="login-form">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" data-testid="login-email-input" className="mt-1.5 h-11"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required autoComplete="current-password" data-testid="login-password-input" className="mt-1.5 h-11"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && <p data-testid="login-error-message" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={loading} data-testid="login-submit-button" className="h-11 w-full rounded-xl bg-blue-800 hover:bg-blue-700">
          {loading ? <Spinner className="h-4 w-4" /> : "Log in"}
        </Button>
      </form>
      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        Demo accounts use synthetic data. Ask the project owner for demo credentials, or register a new patient account.
      </div>
    </AuthShell>
  );
}
