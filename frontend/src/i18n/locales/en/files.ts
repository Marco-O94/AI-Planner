export const files = {
  header: {
    title: "File Explorer",
    description:
      "Browse every saved file grouped by project, and search full-text inside file contents.",
  },
  search: {
    placeholder: "Search inside file contents…",
    ariaLabel: "Search inside file contents",
    clearAriaLabel: "Clear search",
    modeGroupAriaLabel: "Search mode",
    modes: {
      lexical: { label: "Exact", hint: "Match the words inside file contents" },
      semantic: { label: "By meaning", hint: "Find conceptually related content" },
      hybrid: { label: "Hybrid", hint: "Fuse exact + semantic ranking" },
    },
  },
  filters: {
    projectAriaLabel: "Scope to project",
    allProjects: "All projects",
    kindAriaLabel: "Filter by kind",
    anyKind: "Any kind",
    anyTag: "Any tag",
    filterTagPlaceholder: "Filter tag…",
    noTagsFound: "No tags found.",
  },
  kinds: {
    documents: "Documents",
    artifactFiles: "Artifact files",
    notes: "Notes",
    document: "Document",
    artifactFile: "Artifact file",
    note: "Note",
  },
  count: {
    file: "{count} file",
    files: "{count} files",
    matching: " matching your search",
    acrossProjects: " across {count} projects",
  },
  row: {
    inProject: "in {project}",
  },
  empty: {
    errorTitle: "Couldn't load files",
    errorDescription:
      "Something went wrong while fetching saved files. Try again in a moment.",
    noMatchesTitle: "No matches",
    noMatchesDescription:
      "No file contents match your search. Try a different query or switch the search mode.",
    noFilesTitle: "No saved files yet",
    noFilesDescription:
      "Upload documents or generate artifacts in a project and they'll show up here, grouped by project.",
  },
  viewer: {
    inProject: "in {project}",
    matchedSnippet: "Matched snippet",
    noContent: "No readable content for this file.",
    artifactUnavailable:
      "Open this artifact to view the full file set — single artifact files are not fetched directly.",
    loadFailed: "Could not load file contents.",
  },
} as const;
