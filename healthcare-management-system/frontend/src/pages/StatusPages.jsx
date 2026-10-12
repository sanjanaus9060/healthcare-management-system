import { Link } from "react-router-dom";
import { Compass, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/lib/format";

function StatusShell({ icon: Icon, code, title, text, testId }) {
  const { user } = useAuth();
  return (
    <div data-testid={testId} className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-slate-50 px-6">
      <div className="max-w-md text-center animate-fade-up">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-800"><Icon className="h-8 w-8" /></div>
        <p className="mt-6 font-mono text-sm text-teal-700">{code}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-slate-500">{text}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" data-testid="status-home-link"><Button variant="outline" className="rounded-full">Home</Button></Link>
          {user && <Link to={ROLE_HOME[user.role]} data-testid="status-dashboard-link"><Button className="rounded-full bg-blue-800 hover:bg-blue-700">My dashboard</Button></Link>}
        </div>
      </div>
    </div>
  );
}

export const Unauthorized = () => (
  <StatusShell icon={ShieldAlert} code="403" title="Access restricted" testId="unauthorized-page"
    text="Your account role does not have permission to view this page." />
);

export const NotFound = () => (
  <StatusShell icon={Compass} code="404" title="Page not found" testId="not-found-page"
    text="The page you are looking for does not exist or has moved." />
);
