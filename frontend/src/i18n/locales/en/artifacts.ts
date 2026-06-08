export const artifacts = {
  list: {
    untitledType: "Untitled type",
    updated: "Updated {date}",
  },
  empty: {
    loadErrorTitle: "Could not load artifacts",
    loadErrorDescription:
      "Something went wrong fetching this project's artifacts.",
    domainTitle: "No artifacts in this domain",
    noneTitle: "No artifacts yet",
    noneDescription:
      "Generate a typed artifact from your notes and tasks in Claude Code; it will appear here once saved.",
  },
  detail: {
    loadErrorTitle: "Could not load artifact",
    loadErrorDescription:
      "The artifact may have been removed. Go back and try again.",
    backToList: "Back to list",
    allArtifacts: "All artifacts",
    meta: "{type} · v{version} · updated {updated}",
    tabs: {
      files: "Files",
      versions: "Versions & diff",
      checklist: "Checklist",
      sources: "Sources",
    },
    noFilesTitle: "No files in this version",
    noFilesDescription:
      "This version of the artifact has no generated files yet.",
    noSourcesTitle: "No linked sources",
    noSourcesDescription:
      "This version was not generated from tracked notes, tasks, or documents.",
  },
  toolbar: {
    statusLabel: "Artifact status",
    statusChanged: "Artifact marked {status}",
    statusError: "Could not update status",
    exportZip: "Export zip",
    openExport: "Open export",
  },
  files: {
    copyFile: "Copy file",
  },
  coverage: {
    title: "Manifest coverage",
    complete: "All declared files are present.",
    partial: "{present} of {declared} declared files present.",
    completeBadge: "Complete",
    incompleteBadge: "Incomplete",
    present: "Present",
    missing: "Missing",
    extra: "Extra",
    countLabel: "{label} ({count})",
  },
  versions: {
    compare: "Compare",
    baseVersion: "Base version",
    targetVersion: "Target version",
    versionLabel: "v{number}",
    versionLabelDated: "v{number} · {date}",
    onlyOneTitle: "Only one version",
    onlyOneDescription:
      "Diffs appear once a second version of this artifact is generated.",
    noFilesTitle: "No files to compare",
    noFilesDescription:
      "Neither version contains files at the selected revisions.",
  },
  diff: {
    noDifferences: "No differences between these versions.",
  },
  phases: {
    statusChanged: "Phase marked {status}",
    statusError: "Could not update phase",
    statusLabel: "Set status for {title}",
    noPhasesTitle: "No execution phases",
    noPhasesDescription:
      "This artifact does not declare an execution checklist.",
    checklistTitle: "Execution checklist",
    progress: "{done} / {total} done",
  },
  sources: {
    title: "Source items",
    notes: "Notes",
    tasks: "Tasks",
    documents: "Documents",
    countLabel: "{label} ({count})",
  },
} as const;
