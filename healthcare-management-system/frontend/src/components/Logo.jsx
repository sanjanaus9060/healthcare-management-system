import { HeartPulse } from "lucide-react";
import { Link } from "react-router-dom";

export const Logo = ({ to = "/", light = false }) => (
  <Link to={to} data-testid="brand-logo-link" className="flex items-center gap-2.5">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-teal-600 text-white shadow-sm">
      <HeartPulse className="h-5 w-5" />
    </span>
    <span className={`font-heading text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
      Care<span className="text-teal-600">Bridge</span>
    </span>
  </Link>
);
