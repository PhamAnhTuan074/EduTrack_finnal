import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RoomsPage from "./pages/RoomsPage";
import DevicesPage from "./pages/DevicesPage";
import DeviceInventoryPage from "./pages/DeviceInventoryPage";
import ReportCreatePage from "./pages/ReportCreatePage";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage";
import UsersPage from "./pages/UsersPage";
import RepairLogFormPage from "./pages/RepairLogFormPage";
import DeviceHistoryPage from "./pages/DeviceHistoryPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/rooms" element={<ProtectedRoute><RoomsPage /></ProtectedRoute>} />
        <Route path="/rooms/:roomId/devices" element={<ProtectedRoute><DevicesPage /></ProtectedRoute>} />
        <Route path="/devices" element={<ProtectedRoute><DeviceInventoryPage /></ProtectedRoute>} />
        <Route path="/reports/new" element={<ProtectedRoute><ReportCreatePage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/repair-logs/new" element={<ProtectedRoute><RepairLogFormPage /></ProtectedRoute>} />
        <Route path="/devices/:deviceId/history" element={<ProtectedRoute><DeviceHistoryPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;