export const technologies = {
  title: "Tecnologie",
  description:
    "Il catalogo di linguaggi, framework, database e strumenti con cui si possono etichettare i progetti. Rinomine e rimozioni si applicano ovunque siano usati.",
  addType: "Aggiungi",
  builtinEmpty: "Ancora nessuna tecnologia di questo tipo.",
  section: {
    emptyTitle: "Ancora nessuna tecnologia",
    emptyDescription:
      "Le tecnologie vengono create automaticamente quando etichetti un progetto. Puoi anche aggiungerle qui.",
    scrollAria: "Elenco tecnologie {kind}, scorrevole",
  },
  bulk: {
    selectAllAria: "Seleziona tutte le tecnologie {kind}",
    deleteSelected: "Elimina selezionate ({count})",
    confirmTitle: "Eliminare {count} tecnologie?",
    confirmDescription:
      "Le tecnologie ancora usate da un progetto verranno saltate.",
    resultDeleted: "Eliminate {count}",
    resultPartial: "Eliminate {deleted} · {skipped} saltate (in uso)",
  },
  dialog: {
    newTitle: "Nuova tecnologia",
    editTitle: "Modifica tecnologia",
    description: "Scegli un tipo e un nome. Lo slug viene derivato automaticamente.",
    kindLabel: "Tipo",
    nameLabel: "Nome",
    namePlaceholder: "es. TypeScript, PostgreSQL, Docker",
    create: "Aggiungi tecnologia",
  },
  deleteDialog: {
    title: "Eliminare “{name}”?",
    description:
      "Questo rimuove la tecnologia dal catalogo. Le tecnologie ancora associate a un progetto non possono essere eliminate.",
  },
  toasts: {
    created: "Tecnologia aggiunta.",
    updated: "Tecnologia aggiornata.",
    deleted: "Tecnologia eliminata.",
    saveError: "Impossibile salvare la tecnologia.",
    deleteError: "Impossibile eliminare la tecnologia.",
  },
  errors: {
    loadTitle: "Impossibile caricare le tecnologie",
    loadDescription: "Il backend potrebbe non essere disponibile. Riprova tra un momento.",
  },
} as const;
