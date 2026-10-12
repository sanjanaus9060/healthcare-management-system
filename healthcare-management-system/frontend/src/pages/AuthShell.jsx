import { Logo } from "@/components/Logo";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 animate-fade-up">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-slate-500">{footer}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/images/hero.jpg" alt="Healthcare consultation" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-900/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="font-heading text-3xl font-bold leading-tight">Your health story, securely in one place.</p>
          <p className="mt-3 max-w-md text-sm text-blue-100">Digital health card, records, appointments and an AI guide - built with role-based security.</p>
        </div>
      </div>
    </div>
  );
}
