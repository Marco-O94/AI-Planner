// Compilato dalla traduzione dei tipi di artefatto.
export const artifactTypes = {
  header: {
    title: "Tipi di artefatto",
    description:
      "Definisci i tipi di artefatto che l'agente deve generare dopo aver analizzato il materiale di input. Un tipo di artefatto specifica come l'agente genera un artefatto e quali file deve produrre. (Per artefatto si intende un output generato dall'agente, come un piano, un rapporto o un codice.)",
    newType: "Nuovo tipo",
  },
  card: {
    defaultBadge: "Predefinito",
    defaultTitle: "Predefinito integrato — sola lettura",
    actionsFor: "Azioni per {name}",
    fileCount: "{count} file",
    fileCountPlural: "{count} file",
    noFiles: "Nessun file dichiarato.",
    moreFiles: "+{count} altri",
    showInstructions: "Mostra istruzioni",
    hideInstructions: "Nascondi istruzioni",
  },
  dialog: {
    editTitle: "Modifica tipo di artefatto",
    newTitle: "Nuovo tipo di artefatto",
    description:
      "Definisci come l'agente genera questo artefatto e quali file deve produrre.",
    nameLabel: "Nome",
    namePlaceholder: "Specifica API",
    descriptionLabel: "Descrizione",
    descriptionPlaceholder: "Un breve riassunto di questo tipo di artefatto",
    instructionsLabel: "Istruzioni di generazione (markdown)",
    instructionsPlaceholder:
      "Descrivi come l'agente deve costruire questo artefatto…\n\n- Usa…\n- Includi…",
    createType: "Crea tipo",
  },
  manifest: {
    label: "Manifesto dei file",
    hint: "File dichiarati che questo artefatto deve produrre",
    emptyState: "Nessun file ancora dichiarato.",
    pathPlaceholder: "docs/plan.md",
    notePlaceholder: "A cosa serve questo file",
    filePathLabel: "Percorso file {index}",
    fileNoteLabel: "Nota file {index}",
    removeFileLabel: "Rimuovi file {index}",
    addFile: "Aggiungi file",
  },
  deleteDialog: {
    title: 'Eliminare "{name}"?',
    description:
      "Questa operazione rimuove definitivamente il tipo di artefatto. Gli artefatti già generati da esso non vengono interessati. L'azione non può essere annullata.",
  },
  toasts: {
    created: "Tipo di artefatto creato",
    updated: "Tipo di artefatto aggiornato",
    deleted: "Tipo di artefatto eliminato",
    saveError: "Impossibile salvare il tipo di artefatto",
    deleteError: "Impossibile eliminare il tipo di artefatto",
  },
  errors: {
    loadTitle: "Impossibile caricare i tipi di artefatto",
    loadDescription: "Il backend potrebbe non essere disponibile. Riprova tra un momento.",
  },
  empty: {
    title: "Nessun tipo di artefatto",
    description:
      "Crea il tuo primo tipo di artefatto per indicare all'agente come generarlo e quali file produrre.",
  },
} as const;
