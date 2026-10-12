import { Link } from "react-router-dom";
import {
  ArrowRight, Bot, CalendarCheck, CheckCircle2, CreditCard, FileHeart, Lock, QrCode, ShieldCheck, Stethoscope, Users, Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/lib/format";

const FEATURES = [
  { icon: CreditCard, title: "Digital Health Card", text: "A printable ID card with blood group, allergies, emergency contact and a revocable QR code.", span: "md:col-span-2" },
  { icon: Bot, title: "AI Health Assistant", text: "Plain-language health education and appointment preparation, with clear safety limits." },
  { icon: CalendarCheck, title: "Smart Appointments", text: "Real-time slot availability with duplicate-booking prevention and status tracking." },
  { icon: FileHeart, title: "Medical Records", text: "Consultations, prescriptions, diagnoses and document metadata in one timeline.", span: "md:col-span-2" },
  { icon: ShieldCheck, title: "Role-Based Security", text: "Patients, doctors and administrators each see only what they are authorized to see." },
  { icon: Users, title: "Admin Console", text: "Manage accounts, doctors and appointments, and review system activity." },
];

const STEPS = [
  { n: "01", title: "Register", text: "Patients create an account and instantly receive a unique health card ID." },
  { n: "02", title: "Complete your card", text: "Add blood group, allergies, conditions and an emergency contact." },
  { n: "03", title: "Book a doctor", text: "Pick a specialist and an open slot. Booking grants that doctor access to your records." },
  { n: "04", title: "Consult & track", text: "Doctors add notes and prescriptions; you see everything in your records." },
];

function Hero({ cta }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-teal-100/60 blur-3xl" />
      <div className="absolute -left-32 top-40 h-[360px] w-[360px] rounded-full bg-emerald-100/50 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
        <div className="stagger space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> AI-powered integrated health card
          </span>
          <h1 className="font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            One card. Every record.<br /><span className="bg-gradient-to-r from-blue-700 via-teal-600 to-emerald-500 bg-clip-text text-transparent">Care that connects.</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            CareBridge unifies your digital health card, medical history, appointments and an AI health guide in a single secure portal for patients, doctors and hospital administrators.
          </p>
          <div className="flex flex-wrap gap-3">
            {cta}
            <a href="#how-it-works" data-testid="landing-how-it-works-link">
              <Button variant="outline" size="lg" className="h-12 rounded-full px-6">How it works</Button>
            </a>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-slate-500">
            {["Bcrypt + JWT security", "Revocable QR access", "Synthetic demo data"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{t}</span>
            ))}
          </div>
        </div>
        <div className="relative animate-fade-up">
          <img src="/images/hero.jpg" alt="Doctor consulting a patient" className="h-[420px] w-full rounded-[28px] object-cover shadow-2xl lg:h-[520px]" />
          <div className="absolute -bottom-6 left-4 w-72 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 p-5 text-white shadow-2xl sm:-left-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-teal-200">CareBridge Health ID</p>
            <p className="mt-2 font-heading text-lg font-bold">Priya Nair</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full border border-red-300/40 bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-100">B+</span>
              <QrCode className="h-10 w-10 rounded-md bg-white p-1 text-slate-900" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const Section = ({ id, eyebrow, title, children, className = "" }) => (
  <section id={id} className={`mx-auto max-w-7xl px-5 py-20 sm:px-8 ${className}`}>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">{eyebrow}</p>
    <h2 className="mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
    <div className="mt-12">{children}</div>
  </section>
);

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? (
    <Link to={ROLE_HOME[user.role]} data-testid="landing-dashboard-button">
      <Button size="lg" className="h-12 rounded-full bg-blue-800 px-7 hover:bg-blue-700">Go to dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button>
    </Link>
  ) : (
    <Link to="/register" data-testid="landing-get-started-button">
      <Button size="lg" className="h-12 rounded-full bg-blue-800 px-7 hover:bg-blue-700">Get your health card <ArrowRight className="ml-2 h-4 w-4" /></Button>
    </Link>
  );

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#problem" className="hover:text-blue-800">Problem</a>
            <a href="#features" className="hover:text-blue-800">Features</a>
            <a href="#how-it-works" className="hover:text-blue-800">How it works</a>
            <a href="#benefits" className="hover:text-blue-800">Benefits</a>
          </nav>
          <div className="flex items-center gap-2">
            {!user && <Link to="/login" data-testid="landing-login-button"><Button variant="ghost" className="rounded-full">Log in</Button></Link>}
            {user ? (
              <Link to={ROLE_HOME[user.role]} data-testid="landing-header-dashboard-button"><Button className="rounded-full bg-blue-800 hover:bg-blue-700">Dashboard</Button></Link>
            ) : (
              <Link to="/register" data-testid="landing-register-button"><Button className="rounded-full bg-blue-800 hover:bg-blue-700">Register</Button></Link>
            )}
          </div>
        </div>
      </header>

      <Hero cta={cta} />

      <Section id="problem" eyebrow="The problem" title="Health information is scattered, and that slows care down.">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Fragmented records", "Prescriptions, reports and allergies live on paper files across different clinics."],
            ["Unsafe emergencies", "Critical details like blood group or allergies are unavailable when they matter most."],
            ["Manual scheduling", "Phone-based booking leads to double bookings, long waits and missed follow-ups."],
          ].map(([t, d]) => (
            <div key={t} className="card-surface p-6">
              <p className="font-heading text-lg font-semibold text-slate-900">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-3xl bg-slate-50 p-8">
          <p className="font-heading font-semibold text-slate-900">Project objectives</p>
          <ul className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            {[
              "Give every patient a secure, portable digital health card",
              "Centralize medical records with clinician-only write access",
              "Automate appointment booking with conflict prevention",
              "Offer safe, educational AI support for health questions",
            ].map((o) => (
              <li key={o} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{o}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="features" eyebrow="Key features" title="Everything a modern clinic portal needs." className="bg-white">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text, span = "" }) => (
            <div key={title} className={`card-surface group p-7 ${span}`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-teal-50 text-blue-800 transition-transform duration-300 group-hover:-translate-y-1">
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-5 font-heading text-lg font-semibold text-slate-900">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <section id="how-it-works" className="bg-gradient-to-b from-blue-950 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">How it works</p>
          <h2 className="mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">From sign-up to consultation in four steps.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <p className="font-mono text-sm text-teal-300">{s.n}</p>
                <p className="mt-3 font-heading text-lg font-semibold">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm text-slate-300">
            <Workflow className="h-5 w-5 text-emerald-400" /> React frontend · FastAPI backend · MongoDB · modular AI service
          </div>
        </div>
      </section>

      <Section id="benefits" eyebrow="Benefits" title="Better for patients, doctors and hospitals.">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <img src="/images/consult.jpg" alt="Medical consultation" className="h-80 w-full rounded-3xl object-cover" />
          <div className="space-y-6">
            {[
              [Users, "Patients", "Own their health information and carry it anywhere via a QR-enabled card."],
              [Stethoscope, "Doctors", "See authorized history before a visit and record notes and prescriptions in seconds."],
              [Lock, "Administrators", "Oversee operations with statistics and activity logs, without exposing medical details."],
            ].map(([Icon, t, d]) => (
              <div key={t} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="font-heading font-semibold text-slate-900">{t}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:px-8">
          <Logo />
          <p>College project demonstration · Uses synthetic data only · Not for real clinical use.</p>
        </div>
      </footer>
    </div>
  );
}
