export const noteTypes = {
  builtin: "Predefinito",
  addType: "Aggiungi tipo",
  addGlobalType: "Aggiungi tipo globale",
  project: {
    title: "Tipi di nota del progetto",
    description: "Tipi disponibili solo in questo progetto.",
    emptyTitle: "Nessun tipo di progetto",
    emptyDescription: "Aggiungi un tipo per le note specifiche di questo progetto.",
  },
  global: {
    title: "Tipi di nota globali",
    description: "Condivisi tra tutti i progetti.",
  },
  dialog: {
    newTitle: "Nuovo tipo di nota",
    editTitle: "Modifica tipo di nota",
    description: "Assegna un nome al tipo e scegli un colore.",
    nameLabel: "Nome",
    namePlaceholder: "es. Rischio",
    descriptionLabel: "Descrizione",
    descriptionPlaceholder: "Facoltativa",
    colorLabel: "Colore",
    preview: "Anteprima",
    createType: "Crea tipo",
  },
  deleteDialog: {
    title: 'Eliminare "{name}"?',
    description:
      "Operazione irreversibile. I tipi ancora usati dalle note non possono essere eliminati.",
  },
  toasts: {
    created: "Tipo di nota creato",
    updated: "Tipo di nota aggiornato",
    deleted: "Tipo di nota eliminato",
    saveError: "Impossibile salvare il tipo di nota",
    deleteError: "Impossibile eliminare il tipo di nota",
  },
} as const;
