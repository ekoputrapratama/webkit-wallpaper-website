import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import ThemeDetailPage from "./components/ThemeDetailPage";
import ThemeForm from "./components/ThemeForm";
import ThemeList from "./components/ThemeList";
import ProfilePage from "./components/ProfilePage";
import AuthorProfile from "./components/AuthorProfile";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <div className="app">
        <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/theme/:id" element={<ThemeDetailPage />} />
          <Route path="/author/:uid" element={<AuthorProfile />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/submit"
            element={
              <ProtectedRoute>
                <ThemeFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit/:id"
            element={
              <ProtectedRoute>
                <EditThemePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage"
            element={
              <ProtectedRoute>
                <ThemeListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      </div>
    </>
  );
}

function ThemeFormPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleSubmitted = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <ThemeForm user={user} onSubmitted={handleSubmitted} />
  );
}

function ThemeListPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <ThemeList key={refreshKey} user={user} />
  );
}

function EditThemePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleSubmitted = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <ThemeForm key={refreshKey} user={user} themeId={id} onSubmitted={handleSubmitted} />
  );
}
