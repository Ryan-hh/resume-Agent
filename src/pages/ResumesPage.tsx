import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FilePlus2, FolderOpen, FileText } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { ResumeCardItem } from "@/components/dashboard/ResumeCardItem";
import { CreateResumeModal } from "@/components/dashboard/CreateResumeModal";
import { ImportResumeDialog } from "@/components/dashboard/ImportResumeDialog";
import { Button } from "@/components/ui/button";

// 我的简历页
export default function ResumesPage() {
  const navigate = useNavigate();
  const resumes = useResumeStore((s) => s.resumes);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  const sortedResumes = Object.values(resumes).sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );

  const handleOpen = (id: string) => navigate(`/workbench/${id}`);

  return (
    <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">
      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-8 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="h-6 w-6 text-primary" />
            我的简历
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sortedResumes.length > 0
              ? `共 ${sortedResumes.length} 份简历，点击卡片进入编辑`
              : "还没有简历"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" onClick={() => setImportOpen(true)}>
            <FolderOpen className="h-4 w-4" />
            导入
          </Button>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <FilePlus2 className="h-4 w-4" />
            新建简历
          </Button>
        </div>
      </motion.div>

      {sortedResumes.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {sortedResumes.map((resume, index) => (
              <motion.div
                key={resume.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: index * 0.1, duration: 0.25, ease: "easeOut" },
                }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <ResumeCardItem resume={resume} onOpen={() => handleOpen(resume.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <CreateResumeModal open={createOpen} onOpenChange={setCreateOpen} />
      <ImportResumeDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
