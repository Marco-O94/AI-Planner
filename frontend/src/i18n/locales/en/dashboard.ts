export const dashboard = {
  header: {
    title: "Projects",
    description:
      "Capture notes, tasks and documents per project and domain, then generate typed artifacts.",
  },
  filters: {
    searchPlaceholder: "Search projects by name or description…",
    searchAria: "Search projects",
    status: "Status",
    language: "Language",
    framework: "Framework",
    database: "Database",
    any: "Any {label}",
    clear: "Clear filters",
    clearAll: "Clear all",
    activeAria: "Active filters",
    removeFilter: "Remove {label} filter",
  },
  card: {
    updated: "Updated {date}",
    noDescription: "No description yet.",
    more: "+{count} more",
    notes: "notes",
    tasks: "tasks",
    artifacts: "artifacts",
  },
  errorState: {
    title: "Could not load projects",
    description: "Check that the backend is reachable, then try again.",
  },
  emptyFiltered: {
    title: "No matching projects",
    description:
      "No projects match the current filters. Try clearing them or adjusting your search.",
  },
  empty: {
    title: "No projects yet",
    description:
      "Create your first project to start capturing notes, tasks and documents.",
  },
  create: {
    trigger: "New project",
    title: "New project",
    description: "Start a project from scratch or seed it from a template.",
    nameLabel: "Name",
    namePlaceholder: "My new project",
    descriptionLabel: "Description",
    descriptionPlaceholder: "What is this project about?",
    statusLabel: "Status",
    templateLabel: "From template",
    technologiesLabel: "Technologies",
    submit: "Create project",
    nameRequired: "Project name is required.",
    created: "Created “{name}”.",
    error: "Could not create project.",
  },
  techPicker: {
    add: "Add technologies",
    searchPlaceholder: "Search technologies…",
    empty: "No technology found.",
    remove: "Remove {name}",
    kinds: {
      LANGUAGE: "Language",
      FRAMEWORK: "Framework",
      DATABASE: "Database",
      TOOL: "Tool",
    },
  },
} as const;
