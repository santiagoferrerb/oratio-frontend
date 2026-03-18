import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import AdminPromptTemplatesPage from "../pages/AdminPromptTemplatesPage";
import CompaniesPage from "../pages/CompaniesPage";
import DashboardPage from "../pages/DashboardPage";
import LoginPage from "../pages/LoginPage";
import ScriptGenerationsPage from "../pages/ScriptGenerationsPage";
import VideosPage from "../pages/VideosPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return user?.role?.name === "admin" ? children : <Navigate to="/dashboard" replace />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="script-generations" element={<ScriptGenerationsPage />} />
          <Route
            path="admin/prompt-templates"
            element={
              <AdminRoute>
                <AdminPromptTemplatesPage />
              </AdminRoute>
            }
          />
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
