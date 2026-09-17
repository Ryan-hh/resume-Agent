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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">我的简历</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sortedResumes.length > 0
              ? `共 ${sortedResumes.length} 份简历，点击卡片进入编辑`
              : "导入已有简历，或新建一份开始制作"}
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
      </div>

      {sortedResumes.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} onImport={() => setImportOpen(true)} />
      ) : (
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

function EmptyState({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-border bg-background/60 px-6 py-24">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 text-primary">
        <FileText className="h-8 w-8" />
      </span>
      <div className="text-center">
        <p className="text-base font-medium">还没有简历</p>
        <p className="mt-1 text-sm text-muted-foreground">导入已有简历，或新建一份开始制作</p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onImport}>
          <FolderOpen className="h-4 w-4" />
          导入
        </Button>
        <Button onClick={onCreate}>
          <FilePlus2 className="h-4 w-4" />
          新建简历
        </Button>
      </div>
    </div>
  );
}
