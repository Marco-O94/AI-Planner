export const documents = {
  uploader: {
    uploading: "Uploading {name}…",
    dropToUpload: "Drop to upload",
    dragAndDrop: "Drag & drop a document here",
    acceptedHint: "PDF, DOCX, Markdown, or text · up to {size}",
    chooseFile: "Choose file",
    tagsLabel: "Tags",
    tagsHint: "(comma-separated, optional)",
    tagsPlaceholder: "spec, reference",
    clearTags: "Clear tags",
    domainLabel: "Domain",
    domainHint: "(optional)",
    projectLevel: "Project-level",
    footnote:
      "Accepted: {extensions}. Documents are indexed for search automatically after upload.",
    toasts: {
      uploaded: "Uploaded “{title}”",
      failed: "Upload failed",
    },
    rejection: {
      tooLarge: "File is too large (max 25 MB).",
      invalidType: "Unsupported file type. Use PDF, DOCX, Markdown, or text.",
      tooMany: "Too many files dropped at once.",
      generic: "File could not be accepted.",
    },
  },
  list: {
    searchPlaceholder: "Search documents by name or tag…",
    searchAria: "Search documents",
    allTypes: "All types",
    loadError: {
      title: "Couldn’t load documents",
      description: "Please try again.",
    },
    empty: {
      title: "No documents yet",
      description:
        "Drop a PDF, DOCX, Markdown, or text file above. It will be indexed for search automatically.",
    },
    noMatches: {
      title: "No matches",
      description: "No documents match the current search or type filter.",
    },
  },
  row: {
    previewAria: "Preview {title}",
    actions: "Document actions",
    added: "Added {date}",
    preview: "Preview",
  },
  badge: {
    indexed: "Indexed",
    indexedTooltip: "Vectorized and searchable",
    pending: "Pending",
    pendingTooltip: "Awaiting indexing — not yet searchable",
  },
  preview: {
    copyText: "Copy text",
    noText: {
      title: "No extracted text",
      description:
        "This document has no readable text yet — download the original to view it.",
    },
  },
  delete: {
    title: "Delete document?",
    description:
      "“{title}” and its extracted text will be removed from this project and search. This cannot be undone.",
  },
  toasts: {
    deleted: "Deleted “{title}”",
    deleteFailed: "Could not delete document",
  },
} as const;
