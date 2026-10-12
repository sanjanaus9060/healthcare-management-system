import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bot, CalendarCheck, CalendarPlus, ClipboardList, CreditCard, FileHeart, LayoutDashboard, LogOut, Menu, ShieldCheck, UserCog,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { initials } from "@/lib/format";

const NAV = {
  patient: [
    { to: "/patient", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/patient/health-card", label: "Health Card", icon: CreditCard },
    { to: "/patient/records", label: "Medical Records", icon: FileHeart },
    { to: "/patient/book", label: "Book Appointment", icon: CalendarPlus },
    { to: "/patient/appointments", label: "Appointment History", icon: CalendarCheck },
    { to: "/assistant", label: "AI Assistant", icon: Bot },
    { to: "/profile", label: "Profile & Settings", icon: UserCog },
  ],
  doctor: [
    { to: "/doctor", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/doctor/appointments", label: "Appointments", icon: ClipboardList },
    { to: "/assistant", label: "AI Assistant", icon: Bot },
    { to: "/profile", label: "Profile & Settings", icon: UserCog },
  ],
  admin: [
    { to: "/admin", label: "Admin Dashboard", icon: ShieldCheck, end: true },
    { to: "/profile", label: "Profile & Settings", icon: UserCog },
  ],
};

const ROLE_BADGE = {
  patient: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  doctor: "bg-teal-50 text-teal-700 ring-teal-200",
  admin: "bg-blue-50 text-blue-700 ring-blue-200",
};

function NavList({ role, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV[role].map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          data-testid={`nav-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-200 ${
              isActive ? "bg-blue-50 font-semibold text-blue-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`
          }
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50/70">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white py-6 lg:flex">
        <div className="px-6 pb-8"><Logo to="/" /></div>
        <NavList role={user.role} />
        <div className="mt-auto px-6 text-xs text-slate-400">Synthetic demo data only</div>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-white p-0 py-6">
          <SheetTitle className="px-6 pb-8"><Logo to="/" /></SheetTitle>
          <NavList role={user.role} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <Button data-testid="mobile-menu-button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span data-testid="topbar-role-badge" className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${ROLE_BADGE[user.role]}`}>
              {user.role} portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p data-testid="topbar-user-name" className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-teal-100 text-sm font-bold text-blue-800">
              {initials(user.name)}
            </div>
            <Button data-testid="logout-button" variant="ghost" size="icon" onClick={handleLogout} title="Log out">
              <LogOut className="h-[18px] w-[18px] text-slate-600" />
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8 animate-fade-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
