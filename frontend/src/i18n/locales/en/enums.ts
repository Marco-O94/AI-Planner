export const enums = {
  taskStatus: { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" },
  taskPriority: { LOW: "Low", MEDIUM: "Medium", HIGH: "High" },
  projectStatus: { ACTIVE: "Active", PAUSED: "Paused", ARCHIVED: "Archived" },
  artifactStatus: { DRAFT: "Draft", APPROVED: "Approved", ARCHIVED: "Archived" },
  phaseStatus: { PENDING: "Pending", IN_PROGRESS: "In Progress", DONE: "Done" },
  noteType: {
    REQUIREMENT: "Requirement",
    CONSTRAINT: "Constraint",
    DECISION: "Decision",
    QUESTION: "Question",
    SNIPPET: "Snippet",
    REFERENCE: "Reference",
  },
  techKind: {
    LANGUAGE: "Language",
    FRAMEWORK: "Framework",
    DATABASE: "Database",
    TOOL: "Tool",
  },
  scope: { GLOBAL: "Global", PROJECT: "Project" },
} as const;
