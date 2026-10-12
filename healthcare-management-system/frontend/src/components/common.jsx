import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Spinner = ({ className = "h-5 w-5" }) => <Loader2 className={`animate-spin ${className}`} />;

export const PageLoader = ({ label = "Loading..." }) => (
  <div data-testid="page-loader" className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
    <Spinner className="h-8 w-8 text-blue-700" />
    <p className="text-sm">{label}</p>
  </div>
);

export const PageHeader = ({ title, subtitle, action, eyebrow }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="space-y-1.5">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p>}
      <h1 data-testid="page-title" className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      {subtitle && <p className="max-w-2xl text-sm text-slate-500 sm:text-base">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const TONES = {
  blue: "bg-blue-50 text-blue-700",
  teal: "bg-teal-50 text-teal-700",
  mint: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-700",
};

export const StatCard = ({ icon: Icon, label, value, tone = "blue", testId, hint }) => (
  <div data-testid={testId} className="card-surface flex items-start gap-4 p-5">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="font-heading text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
    </div>
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, description, action, testId = "empty-state" }) => (
  <div data-testid={testId} className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
      <Icon className="h-6 w-6" />
    </div>
    <p className="font-heading font-semibold text-slate-800">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div data-testid="error-state" className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center">
    <AlertCircle className="h-5 w-5 shrink-0" />
    <p className="flex-1 text-sm">{message}</p>
    {onRetry && (
      <Button data-testid="error-retry-button" variant="outline" size="sm" onClick={onRetry} className="border-red-300 bg-white text-red-700 hover:bg-red-100">
        <RefreshCw className="mr-2 h-4 w-4" /> Retry
      </Button>
    )}
  </div>
);

const STATUS = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

export const StatusBadge = ({ status, testId }) => (
  <span data-testid={testId || `status-badge-${status}`} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS[status] || STATUS.cancelled}`}>
    {status}
  </span>
);

export const FieldError = ({ message, testId }) =>
  message ? <p data-testid={testId} className="mt-1.5 text-xs font-medium text-red-600">{message}</p> : null;
