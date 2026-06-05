import { useMemo, useState } from "react";

import {
  createDraftTextSection,
  normalizeTextSections,
  type DraftTextSection,
  type TextSectionPatch,
} from "./TextCardContentEditor";

type CreateInitialSections = () => DraftTextSection[];

export function useDraftTextSections(createInitialSections: CreateInitialSections) {
  const [sections, setSections] = useState<DraftTextSection[]>(
    createInitialSections,
  );
  const normalizedSections = useMemo(
    () => normalizeTextSections(sections),
    [sections],
  );

  const updateSection = (sectionId: string, patch: TextSectionPatch) => {
    setSections((currentSections) =>
      currentSections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    );
  };

  const addSection = () => {
    setSections((currentSections) => [
      ...currentSections,
      createDraftTextSection(),
    ]);
  };

  const removeSection = (sectionId: string) => {
    setSections((currentSections) =>
      currentSections.length <= 1
        ? currentSections
        : currentSections.filter((section) => section.id !== sectionId),
    );
  };

  return {
    addSection,
    normalizedSections,
    removeSection,
    sections,
    setSections,
    updateSection,
  };
}
