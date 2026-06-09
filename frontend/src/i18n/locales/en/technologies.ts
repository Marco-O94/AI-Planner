export const technologies = {
  title: "Technologies",
  description:
    "The catalogue of languages, frameworks, databases and tools projects can be tagged with. Renames and removals apply everywhere they are used.",
  addType: "Add",
  builtinEmpty: "No technologies of this kind yet.",
  section: {
    emptyTitle: "No technologies yet",
    emptyDescription:
      "Technologies are created automatically when you tag a project. You can also add them here.",
    scrollAria: "{kind} technologies list, scrollable",
  },
  bulk: {
    selectAllAria: "Select all {kind} technologies",
    deleteSelected: "Delete selected ({count})",
    confirmTitle: "Delete {count} technologies?",
    confirmDescription:
      "Technologies still used by a project will be skipped.",
    resultDeleted: "Deleted {count}",
    resultPartial: "Deleted {deleted} · {skipped} skipped (in use)",
  },
  dialog: {
    newTitle: "New technology",
    editTitle: "Edit technology",
    description: "Pick a kind and a display name. The slug is derived automatically.",
    kindLabel: "Kind",
    nameLabel: "Name",
    namePlaceholder: "e.g. TypeScript, PostgreSQL, Docker",
    create: "Add technology",
  },
  deleteDialog: {
    title: "Delete “{name}”?",
    description:
      "This removes the technology from the catalogue. Technologies still attached to a project cannot be deleted.",
  },
  toasts: {
    created: "Technology added.",
    updated: "Technology updated.",
    deleted: "Technology deleted.",
    saveError: "Could not save the technology.",
    deleteError: "Could not delete the technology.",
  },
  errors: {
    loadTitle: "Couldn't load technologies",
    loadDescription: "The backend may be unavailable. Try again in a moment.",
  },
} as const;
