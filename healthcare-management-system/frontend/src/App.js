import "@/App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CardVerify from "@/pages/CardVerify";
import { NotFound, Unauthorized } from "@/pages/StatusPages";
import PatientDashboard from "@/pages/patient/PatientDashboard";
import HealthCard from "@/pages/patient/HealthCard";
import MedicalRecords from "@/pages/patient/MedicalRecords";
import BookAppointment from "@/pages/patient/BookAppointment";
import AppointmentHistory from "@/pages/patient/AppointmentHistory";
import Assistant from "@/pages/Assistant";
import Profile from "@/pages/Profile";
import DoctorDashboard from "@/pages/doctor/DoctorDashboard";
import DoctorAppointments from "@/pages/doctor/DoctorAppointments";
import PatientRecordsView from "@/pages/doctor/PatientRecordsView";
import AdminDashboard from "@/pages/admin/AdminDashboard";

const guarded = (roles, element) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/card/verify/:token" element={<CardVerify />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route element={guarded(null, <AppLayout />)}>
              <Route path="/patient" element={guarded(["patient"], <PatientDashboard />)} />
              <Route path="/patient/health-card" element={guarded(["patient"], <HealthCard />)} />
              <Route path="/patient/records" element={guarded(["patient"], <MedicalRecords />)} />
              <Route path="/patient/book" element={guarded(["patient"], <BookAppointment />)} />
              <Route path="/patient/appointments" element={guarded(["patient"], <AppointmentHistory />)} />
              <Route path="/doctor" element={guarded(["doctor"], <DoctorDashboard />)} />
              <Route path="/doctor/appointments" element={guarded(["doctor"], <DoctorAppointments />)} />
              <Route path="/doctor/patients/:patientId" element={guarded(["doctor"], <PatientRecordsView />)} />
              <Route path="/admin" element={guarded(["admin"], <AdminDashboard />)} />
              <Route path="/assistant" element={guarded(["patient", "doctor"], <Assistant />)} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </div>
  );
}

export default App;
