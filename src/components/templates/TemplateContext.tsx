import React from "react";
import { TEMPLATES } from "@/config/templates";

interface TemplateContextValue {
  templateId: string;
  menuSections: { id: string; title: string; icon: string; enabled: boolean; order: number }[];
}

const TemplateContext = React.createContext<TemplateContextValue>({
  templateId: TEMPLATES[0].id,
  menuSections: [],
});

export function TemplateProvider({
  templateId,
  menuSections,
  children,
}: {
  templateId: string;
  menuSections: TemplateContextValue["menuSections"];
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ templateId, menuSections }),
    [templateId, menuSections]
  );
  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
}

export const useTemplateContext = () => React.useContext(TemplateContext);
