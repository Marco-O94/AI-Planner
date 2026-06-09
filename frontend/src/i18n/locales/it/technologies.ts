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
} as const;
