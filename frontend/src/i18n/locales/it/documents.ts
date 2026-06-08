export const documents = {
  uploader: {
    uploading: "Caricamento di {name}…",
    dropToUpload: "Rilascia per caricare",
    dragAndDrop: "Trascina e rilascia un documento qui",
    acceptedHint: "PDF, DOCX, Markdown o testo · fino a {size}",
    chooseFile: "Scegli file",
    tagsLabel: "Tag",
    tagsHint: "(separati da virgola, opzionali)",
    tagsPlaceholder: "specifica, riferimento",
    clearTags: "Cancella tag",
    domainLabel: "Contesto",
    domainHint: "(opzionale)",
    projectLevel: "A livello di progetto",
    footnote:
      "Formati accettati: {extensions}. I documenti vengono indicizzati automaticamente per la ricerca dopo il caricamento.",
    toasts: {
      uploaded: "“{title}” caricato",
      failed: "Caricamento non riuscito",
    },
    rejection: {
      tooLarge: "Il file è troppo grande (max 25 MB).",
      invalidType: "Tipo di file non supportato. Usa PDF, DOCX, Markdown o testo.",
      tooMany: "Troppi file rilasciati contemporaneamente.",
      generic: "Impossibile accettare il file.",
    },
  },
  list: {
    searchPlaceholder: "Cerca documenti per nome o tag…",
    searchAria: "Cerca documenti",
    allTypes: "Tutti i tipi",
    loadError: {
      title: "Impossibile caricare i documenti",
      description: "Riprova.",
    },
    empty: {
      title: "Nessun documento",
      description:
        "Trascina qui sopra un file PDF, DOCX, Markdown o di testo. Verrà indicizzato automaticamente per la ricerca.",
    },
    noMatches: {
      title: "Nessun risultato",
      description: "Nessun documento corrisponde alla ricerca o al filtro per tipo attuali.",
    },
  },
  row: {
    previewAria: "Anteprima di {title}",
    actions: "Azioni documento",
    added: "Aggiunto il {date}",
    preview: "Anteprima",
  },
  badge: {
    indexed: "Indicizzato",
    indexedTooltip: "Vettorizzato e ricercabile",
    pending: "In attesa",
    pendingTooltip: "In attesa di indicizzazione — non ancora ricercabile",
  },
  preview: {
    copyText: "Copia testo",
    noText: {
      title: "Nessun testo estratto",
      description:
        "Questo documento non contiene ancora testo leggibile — scarica l’originale per visualizzarlo.",
    },
  },
  delete: {
    title: "Eliminare il documento?",
    description:
      "“{title}” e il relativo testo estratto verranno rimossi da questo progetto e dalla ricerca. L’operazione non può essere annullata.",
  },
  toasts: {
    deleted: "“{title}” eliminato",
    deleteFailed: "Impossibile eliminare il documento",
  },
} as const;
