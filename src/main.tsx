import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/hooks/useTheme";
import HomePage from "@/pages/HomePage";
import DashboardLayout from "@/pages/DashboardLayout";
import ResumesPage from "@/pages/ResumesPage";
import TemplatesPage from "@/pages/TemplatesPage";
import SettingsPage from "@/pages/SettingsPage";
import AISettingsPage from "@/pages/AISettingsPage";
import WorkbenchPage from "@/pages/WorkbenchPage";
import "./index.css";

// 首次打开时若无任何简历，自动创建一份示例简历
import { useResumeStore } from "@/store/useResumeStore";

function EnsureInitialResume() {
  const resumes = useResumeStore((s) => s.resumes);
  const activeResumeId = useResumeStore((s) => s.activeResumeId);

  React.useEffect(() => {
    const state = useResumeStore.getState();
    if (Object.keys(state.resumes).length === 0) {
      state.createResume("classic", false);
    } else if (!activeResumeId) {
      const firstId = Object.keys(state.resumes)[0];
      if (firstId) state.setActiveResume(firstId);
    }
  }, [resumes, activeResumeId]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <EnsureInitialResume />
      <HashRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<ResumesPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="ai" element={<AISettingsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/workbench/:id" element={<WorkbenchPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
