export const files = {
  header: {
    title: "Esplora file",
    description:
      "Sfoglia tutti i file salvati raggruppati per progetto e cerca a testo completo nei contenuti dei file.",
  },
  search: {
    placeholder: "Cerca nei contenuti dei file…",
    ariaLabel: "Cerca nei contenuti dei file",
    clearAriaLabel: "Cancella ricerca",
    modeGroupAriaLabel: "Modalità di ricerca",
    modes: {
      lexical: { label: "Esatta", hint: "Trova le parole esatte nei contenuti dei file" },
      semantic: { label: "Per significato", hint: "Trova contenuti concettualmente correlati" },
      hybrid: { label: "Ibrida", hint: "Combina ranking esatto e semantico" },
    },
  },
  filters: {
    projectAriaLabel: "Limita al progetto",
    allProjects: "Tutti i progetti",
    kindAriaLabel: "Filtra per tipo",
    anyKind: "Qualsiasi tipo",
    anyTag: "Qualsiasi tag",
    filterTagPlaceholder: "Filtra tag…",
    noTagsFound: "Nessun tag trovato.",
  },
  kinds: {
    documents: "Documenti",
    artifactFiles: "File di artefatto",
    notes: "Note",
    document: "Documento",
    artifactFile: "File di artefatto",
    note: "Nota",
  },
  count: {
    file: "{count} file",
    files: "{count} file",
    matching: " corrispondenti alla ricerca",
    acrossProjects: " in {count} progetti",
  },
  row: {
    inProject: "in {project}",
  },
  empty: {
    errorTitle: "Impossibile caricare i file",
    errorDescription:
      "Si è verificato un errore durante il recupero dei file salvati. Riprova tra poco.",
    noMatchesTitle: "Nessuna corrispondenza",
    noMatchesDescription:
      "Nessun contenuto corrisponde alla ricerca. Prova una query diversa o cambia la modalità di ricerca.",
    noFilesTitle: "Ancora nessun file salvato",
    noFilesDescription:
      "Carica documenti o genera artefatti in un progetto e appariranno qui, raggruppati per progetto.",
  },
  viewer: {
    inProject: "in {project}",
    matchedSnippet: "Estratto corrispondente",
    noContent: "Nessun contenuto leggibile per questo file.",
    artifactUnavailable:
      "Apri questo artefatto per vedere l'intero set di file — i singoli file di artefatto non vengono recuperati direttamente.",
    loadFailed: "Impossibile caricare i contenuti del file.",
  },
} as const;
