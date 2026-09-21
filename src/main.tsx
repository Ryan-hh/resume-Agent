import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/hooks/useTheme";
import HomePage from "@/pages/HomePage";
import DashboardLayout from "@/pages/DashboardLayout";
import ResumesPage from "@/pages/ResumesPage";
import TemplatesPage from "@/pages/TemplatesPage";
import AISettingsPage from "@/pages/AISettingsPage";
import EasterEggPage from "@/pages/EasterEggPage";
import WorkbenchPage from "@/pages/WorkbenchPage";
import "./index.css";

// 首次打开时若无任何简历，自动创建一份示例简历；此后用户删空则保持空列表
import { useResumeStore } from "@/store/useResumeStore";

function EnsureInitialResume() {
  const resumes = useResumeStore((s) => s.resumes);
  const activeResumeId = useResumeStore((s) => s.activeResumeId);
  const firstRunCreated = useResumeStore((s) => s.firstRunCreated);

  React.useEffect(() => {
    const state = useResumeStore.getState();
    if (!state.firstRunCreated) {
      if (Object.keys(state.resumes).length === 0) {
        state.createResume(null, false);
      }
      state.markFirstRunCreated();
    } else if (!activeResumeId && Object.keys(state.resumes).length > 0) {
      const firstId = Object.keys(state.resumes)[0];
      if (firstId) state.setActiveResume(firstId);
    }
  }, [resumes, activeResumeId, firstRunCreated]);

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
            <Route path="egg" element={<EasterEggPage />} />
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
