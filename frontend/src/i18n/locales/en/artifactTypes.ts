// Filled by the artifact-types translation pass.
export const artifactTypes = {
  header: {
    title: "Artifact types",
    description:
      "Define reusable artifact blueprints — generation instructions and a declared file manifest. The built-in default is read-only.",
    newType: "New type",
  },
  card: {
    defaultBadge: "Default",
    defaultTitle: "Built-in default — read only",
    actionsFor: "Actions for {name}",
    fileCount: "{count} file",
    fileCountPlural: "{count} files",
    noFiles: "No declared files.",
    moreFiles: "+{count} more",
    showInstructions: "Show instructions",
    hideInstructions: "Hide instructions",
  },
  dialog: {
    editTitle: "Edit artifact type",
    newTitle: "New artifact type",
    description:
      "Define how the agent generates this artifact and which files it should produce.",
    nameLabel: "Name",
    namePlaceholder: "API Specification",
    descriptionLabel: "Description",
    descriptionPlaceholder: "A short summary of this artifact type",
    instructionsLabel: "Generation instructions (markdown)",
    instructionsPlaceholder:
      "Describe how the agent should build this artifact…\n\n- Use…\n- Include…",
    createType: "Create type",
  },
  manifest: {
    label: "File manifest",
    hint: "Declared files this artifact should produce",
    emptyState: "No files declared yet.",
    pathPlaceholder: "docs/plan.md",
    notePlaceholder: "What this file is for",
    filePathLabel: "File path {index}",
    fileNoteLabel: "File note {index}",
    removeFileLabel: "Remove file {index}",
    addFile: "Add file",
  },
  deleteDialog: {
    title: 'Delete "{name}"?',
    description:
      "This permanently removes the artifact type. Existing artifacts already generated from it are not affected. This action cannot be undone.",
  },
  toasts: {
    created: "Artifact type created",
    updated: "Artifact type updated",
    deleted: "Artifact type deleted",
    saveError: "Could not save artifact type",
    deleteError: "Could not delete artifact type",
  },
  errors: {
    loadTitle: "Couldn't load artifact types",
    loadDescription: "The backend may be unavailable. Try again in a moment.",
  },
  empty: {
    title: "No artifact types yet",
    description:
      "Create your first artifact type to tell the agent how to generate it and which files to produce.",
  },
} as const;
