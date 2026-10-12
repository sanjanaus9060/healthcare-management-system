import { Link, useParams } from "react-router-dom";
import { BadgeCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PageLoader } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/lib/useFetch";

export default function CardVerify() {
  const { token } = useParams();
  const { user } = useAuth();
  const { data, loading, error } = useFetch(`/health-card/verify/${token}`);

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-6 py-10">
      <Logo />
      <div className="mt-12 w-full max-w-md">
        {loading ? <PageLoader label="Verifying card..." /> : error ? (
          <div data-testid="card-verify-invalid" className="card-surface p-8 text-center">
            <ShieldX className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 font-heading text-xl font-bold text-slate-900">Card not valid</h1>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </div>
        ) : (
          <div data-testid="card-verify-valid" className="card-surface p-8 text-center">
            <BadgeCheck className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 font-heading text-xl font-bold text-slate-900">Verified CareBridge health card</h1>
            <p className="mt-4 font-heading text-lg text-slate-800">{data.display_name}</p>
            <p data-testid="card-verify-patient-id" className="font-mono text-sm tracking-widest text-teal-700">{data.patient_id}</p>
            <p className="mt-4 text-sm text-slate-500">{data.message}</p>
            {user?.role === "doctor" ? (
              <Link to={`/doctor/patients/${data.patient_user_id}`} data-testid="card-verify-open-records">
                <Button className="mt-6 rounded-full bg-blue-800 hover:bg-blue-700">Open records (if authorized)</Button>
              </Link>
            ) : !user && (
              <Link to="/login" data-testid="card-verify-login"><Button variant="outline" className="mt-6 rounded-full">Clinician login</Button></Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
