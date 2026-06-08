// Filled by the templates translation pass.
export const templates = {
  header: {
    title: "Templates",
    description:
      "Reusable project blueprints. Start a new project from a template, or save an existing project as one from its overview.",
    newTemplate: "New template",
  },
  card: {
    actionsFor: "Actions for {name}",
    noDescription: "No description provided.",
    sectionCount: "{count} section",
    sectionCountPlural: "{count} sections",
    updated: "Updated {date}",
    newProject: "New project from template",
  },
  dialog: {
    editTitle: "Edit template",
    newTitle: "New template",
    editDescription: "Update the name and description for this project template.",
    newDescription:
      "Create a reusable starting point for new projects. Capture its full definition by using “Save as template” on an existing project.",
    nameLabel: "Name",
    namePlaceholder: "SaaS starter",
    descriptionLabel: "Description",
    descriptionPlaceholder: "What kind of project this template is for…",
    createTemplate: "Create template",
  },
  deleteDialog: {
    title: 'Delete "{name}"?',
    description:
      "This permanently removes the template. Projects already created from it are not affected. This action cannot be undone.",
  },
  toasts: {
    created: "Template created",
    updated: "Template updated",
    deleted: "Template deleted",
    saveError: "Could not save template",
    deleteError: "Could not delete template",
  },
  errors: {
    loadTitle: "Couldn't load templates",
    loadDescription: "The backend may be unavailable. Try again in a moment.",
  },
  empty: {
    title: "No templates yet",
    description:
      "Create a template here, or use “Save as template” on a project to capture its full setup.",
  },
} as const;
