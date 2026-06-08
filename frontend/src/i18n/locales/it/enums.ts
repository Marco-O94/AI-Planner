export const enums = {
  taskStatus: { TODO: "Da fare", IN_PROGRESS: "In corso", DONE: "Completato" },
  taskPriority: { LOW: "Bassa", MEDIUM: "Media", HIGH: "Alta" },
  projectStatus: { ACTIVE: "Attivo", PAUSED: "In pausa", ARCHIVED: "Archiviato" },
  artifactStatus: { DRAFT: "Bozza", APPROVED: "Approvato", ARCHIVED: "Archiviato" },
  phaseStatus: { PENDING: "In attesa", IN_PROGRESS: "In corso", DONE: "Completata" },
  noteType: {
    REQUIREMENT: "Requisito",
    CONSTRAINT: "Vincolo",
    DECISION: "Decisione",
    QUESTION: "Domanda",
    SNIPPET: "Frammento",
    REFERENCE: "Riferimento",
  },
  techKind: {
    LANGUAGE: "Linguaggio",
    FRAMEWORK: "Framework",
    DATABASE: "Database",
    TOOL: "Strumento",
  },
  scope: { GLOBAL: "Globale", PROJECT: "Progetto" },
} as const;
