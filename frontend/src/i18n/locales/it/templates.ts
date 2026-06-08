// Compilato dalla traduzione dei modelli.
export const templates = {
  header: {
    title: "Modelli",
    description:
      "Schemi di progetto riutilizzabili. Avvia un nuovo progetto da un modello, oppure salva un progetto esistente come modello dalla sua panoramica.",
    newTemplate: "Nuovo modello",
  },
  card: {
    actionsFor: "Azioni per {name}",
    noDescription: "Nessuna descrizione fornita.",
    sectionCount: "{count} sezione",
    sectionCountPlural: "{count} sezioni",
    updated: "Aggiornato {date}",
    newProject: "Nuovo progetto da modello",
  },
  dialog: {
    editTitle: "Modifica modello",
    newTitle: "Nuovo modello",
    editDescription: "Aggiorna il nome e la descrizione di questo modello di progetto.",
    newDescription:
      "Crea un punto di partenza riutilizzabile per nuovi progetti. Acquisisci la sua definizione completa usando “Salva come modello” su un progetto esistente.",
    nameLabel: "Nome",
    namePlaceholder: "Starter SaaS",
    descriptionLabel: "Descrizione",
    descriptionPlaceholder: "Per quale tipo di progetto è pensato questo modello…",
    createTemplate: "Crea modello",
  },
  deleteDialog: {
    title: 'Eliminare "{name}"?',
    description:
      "Questa operazione rimuove definitivamente il modello. I progetti già creati da esso non vengono interessati. L'azione non può essere annullata.",
  },
  toasts: {
    created: "Modello creato",
    updated: "Modello aggiornato",
    deleted: "Modello eliminato",
    saveError: "Impossibile salvare il modello",
    deleteError: "Impossibile eliminare il modello",
  },
  errors: {
    loadTitle: "Impossibile caricare i modelli",
    loadDescription: "Il backend potrebbe non essere disponibile. Riprova tra un momento.",
  },
  empty: {
    title: "Nessun modello",
    description:
      "Crea un modello qui, oppure usa “Salva come modello” su un progetto per acquisirne la configurazione completa.",
  },
} as const;
