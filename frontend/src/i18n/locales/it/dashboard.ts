export const dashboard = {
  header: {
    title: "Progetti",
    description:
      "Raccogli note, attività e documenti per progetto e dominio, poi genera artefatti tipizzati.",
  },
  filters: {
    searchPlaceholder: "Cerca progetti per nome o descrizione…",
    searchAria: "Cerca progetti",
    status: "Stato",
    language: "Linguaggio",
    framework: "Framework",
    database: "Database",
    any: "Qualsiasi {label}",
    clear: "Cancella filtri",
  },
  card: {
    updated: "Aggiornato il {date}",
    noDescription: "Nessuna descrizione.",
    more: "+{count} altri",
    notes: "note",
    tasks: "attività",
    artifacts: "artefatti",
  },
  errorState: {
    title: "Impossibile caricare i progetti",
    description: "Verifica che il backend sia raggiungibile, poi riprova.",
  },
  emptyFiltered: {
    title: "Nessun progetto corrispondente",
    description:
      "Nessun progetto corrisponde ai filtri attuali. Prova a cancellarli o a modificare la ricerca.",
  },
  empty: {
    title: "Ancora nessun progetto",
    description:
      "Crea il tuo primo progetto per iniziare a raccogliere note, attività e documenti.",
  },
  create: {
    trigger: "Nuovo progetto",
    title: "Nuovo progetto",
    description: "Avvia un progetto da zero oppure parti da un modello.",
    nameLabel: "Nome",
    namePlaceholder: "Il mio nuovo progetto",
    descriptionLabel: "Descrizione",
    descriptionPlaceholder: "Di cosa tratta questo progetto?",
    statusLabel: "Stato",
    templateLabel: "Da modello",
    technologiesLabel: "Tecnologie",
    submit: "Crea progetto",
    nameRequired: "Il nome del progetto è obbligatorio.",
    created: "Creato “{name}”.",
    error: "Impossibile creare il progetto.",
  },
  techPicker: {
    add: "Aggiungi tecnologie",
    searchPlaceholder: "Cerca tecnologie…",
    empty: "Nessuna tecnologia trovata.",
    remove: "Rimuovi {name}",
    kinds: {
      LANGUAGE: "Linguaggio",
      FRAMEWORK: "Framework",
      DATABASE: "Database",
      TOOL: "Strumento",
    },
  },
} as const;
