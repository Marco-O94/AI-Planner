export const skills = {
  // Global library page (/skills) + project skills page header
  page: {
    libraryTitle: "Skill library",
    libraryDescription:
      "Reusable global skills you can attach to any project to guide artifact generation.",
    projectTitle: "Skills",
    projectDescriptionNamed: "Reusable skills for {name}.",
    projectDescription: "Reusable skills for this project.",
    backToProject: "Back to project",
  },

  // Project skills manager
  manager: {
    heading: "Applicable skills",
    subtitle: "Project skills plus any attached global skills.",
    attachGlobal: "Attach global",
    importMd: "Import .md",
    newSkill: "New skill",
    attachedMarker: "Attached",
    loadError: "Couldn’t load skills",
    loadErrorRetry: "Please try again.",
    emptyTitle: "No skills yet",
    emptyDescription: "Create a project skill or attach a global one to guide generation.",
    editAria: "Edit skill",
    detachAria: "Detach skill",
    deleteAria: "Delete skill",
    deleteTitle: "Delete this skill?",
    deleteConfirm: "“{name}” will be permanently removed. This cannot be undone.",
  },

  // Global skills library
  library: {
    searchPlaceholder: "Search skills…",
    importMd: "Import .md",
    newSkill: "New global skill",
    loadError: "Couldn’t load skills",
    loadErrorRetry: "Please try again.",
    emptyTitle: "No global skills yet",
    emptyDescription:
      "Create a reusable, project-independent skill or import one from a Markdown file.",
    noMatchesTitle: "No matches",
    noMatchesDescription: "No skills match your search.",
    exportAria: "Export skill",
    editAria: "Edit skill",
    deleteAria: "Delete skill",
    deleteTitle: "Delete this skill?",
    deleteConfirm:
      "“{name}” will be permanently removed from the global library. This cannot be undone.",
  },

  // Skill card
  card: {
    updated: "Updated {date}",
    hideContent: "Hide content",
    viewContent: "View content",
  },

  // Create / edit dialog
  dialog: {
    editTitle: "Edit skill",
    newTitle: "New skill",
    description: "Skills are reusable instructions Claude Code can pull into a project.",
    scopeLabel: "Scope",
    nameLabel: "Name",
    namePlaceholder: "e.g. Repository pattern",
    descriptionLabel: "Description",
    descriptionPlaceholder: "One line on when to use this skill",
    contentLabel: "Content",
    contentHint: "(markdown)",
    contentPlaceholder: "## Guidance\n\nWrite the reusable instructions here…",
    tagsLabel: "Tags",
    tagsHint: "(space or comma)",
    tagsPlaceholder: "architecture, testing",
    createSkill: "Create skill",
  },

  // Attach global skills dialog
  attach: {
    title: "Attach global skills",
    description: "Toggle which global skills apply to this project.",
    searchPlaceholder: "Search global skills…",
    loadError: "Couldn’t load skills",
    loadErrorRetry: "Try again.",
    noMatchesTitle: "No matches",
    emptyTitle: "No global skills yet",
    noMatchesDescription: "Try a different search.",
    emptyDescription: "Create a global skill in the library first.",
  },

  // Markdown upload dialog
  upload: {
    title: "Import skill from Markdown",
    descriptionPrefix: "Drop a ",
    descriptionSuffix: " file with frontmatter (name, description, scope).",
    untitled: "Untitled",
    changeFileAria: "Choose a different file",
    nameLabel: "Name",
    descriptionLabel: "Description",
    scopeLabel: "Scope",
    tagsLabel: "Tags",
    tagsPlaceholder: "architecture, testing",
    attachAfterImport: "Attach to this project after import",
    importSkill: "Import skill",
    importing: "Importing…",
  },

  // Dropzone
  dropzone: {
    prompt: "Drop a .md file or click to browse",
    hint: "Frontmatter is parsed automatically",
  },

  // Toasts + validation
  toasts: {
    detached: "Detached “{name}”",
    detachError: "Could not detach skill",
    deleted: "Deleted “{name}”",
    deleteError: "Could not delete skill",
    attached: "Attached “{name}”",
    updateError: "Could not update skill",
    skillCreated: "Skill created",
    skillUpdated: "Skill updated",
    saveError: "Could not save skill",
    imported: "Imported “{name}”",
    importError: "Could not import skill",
    chooseMd: "Please choose a Markdown (.md) file",
    readError: "Could not read that file",
    nameDescriptionRequired: "Name and description are required",
  },
} as const;
