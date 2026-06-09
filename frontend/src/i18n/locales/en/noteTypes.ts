export const noteTypes = {
  builtin: "Built-in",
  addType: "Add type",
  addGlobalType: "Add global type",
  project: {
    title: "Project note types",
    description: "Types available only in this project.",
    emptyTitle: "No project types yet",
    emptyDescription: "Add a type to capture notes specific to this project.",
  },
  global: {
    title: "Global note types",
    description: "Shared across every project.",
  },
  dialog: {
    newTitle: "New note type",
    editTitle: "Edit note type",
    description: "Name the type and pick a color.",
    nameLabel: "Name",
    namePlaceholder: "e.g. Risk",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Optional",
    colorLabel: "Color",
    preview: "Preview",
    createType: "Create type",
  },
  deleteDialog: {
    title: 'Delete "{name}"?',
    description: "This cannot be undone. Types still used by notes cannot be deleted.",
  },
  toasts: {
    created: "Note type created",
    updated: "Note type updated",
    deleted: "Note type deleted",
    saveError: "Could not save the note type",
    deleteError: "Could not delete the note type",
  },
} as const;
