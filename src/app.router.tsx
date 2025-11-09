import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "./layouts/dashboard";
import DashboardPage from "./modules/Dashboard/dashboard-page";
import LoginPage from "./pages/login";
import NotFoundPage from "./pages/not-found";
import DoctorsPage from "./modules/Doctors/doctors";
import { AuthProvider } from "./auth/ProtectedRoute";
import DevicesPage from "./modules/Device/devices";
import PatientPage from "./modules/Patient/patient";
import FamilyPage from "./modules/Family/family";
import BreathingPractice from "./modules/Practice/practice";
import AudioAnalysis from "./modules/Evaluation/evaluation";
import PatientSessionPage from "./modules/Session/session.page";
import FamilyPatientsPage from "./modules/FamilyPatients/familyPatients.page";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <AuthProvider>
        <DashboardLayout />
      </AuthProvider>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "evaluation", element: <AudioAnalysis /> },
      { path: "doctor", element: <DoctorsPage /> },
      { path: "devices", element: <DevicesPage /> },
      { path: "patients", element: <PatientPage /> },
      { path: "family", element: <FamilyPage /> },
      { path: "practice", element: <BreathingPractice /> },
      // routes
      { path: "session/:id", element: <PatientSessionPage /> },

      { path: "me", element: <PatientSessionPage /> },
      { path: "me/:id", element: <PatientSessionPage /> },
      { path: "family/patients", element: <FamilyPatientsPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
