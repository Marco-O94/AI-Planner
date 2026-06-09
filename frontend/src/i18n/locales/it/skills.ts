export const skills = {
  // Pagina libreria globale (/skills) + intestazione pagina skill di progetto
  page: {
    libraryTitle: "Libreria delle skill",
    libraryDescription:
      "Skill globali riutilizzabili che puoi collegare a qualsiasi progetto per guidare la generazione degli artefatti.",
    projectTitle: "Skill",
    projectDescriptionNamed: "Skill riutilizzabili per {name}.",
    projectDescription: "Skill riutilizzabili per questo progetto.",
    backToProject: "Torna al progetto",
  },

  // Gestore skill di progetto
  manager: {
    heading: "Skill applicabili",
    subtitle: "Le skill di progetto e tutte le skill globali collegate.",
    attachGlobal: "Collega globale",
    importMd: "Importa .md",
    newSkill: "Nuova skill",
    attachedMarker: "Collegata",
    loadError: "Impossibile caricare le skill",
    loadErrorRetry: "Riprova.",
    emptyTitle: "Ancora nessuna skill",
    emptyDescription:
      "Crea una skill di progetto o collegane una globale per guidare la generazione.",
    editAria: "Modifica skill",
    detachAria: "Scollega skill",
    deleteAria: "Elimina skill",
    deleteTitle: "Eliminare questa skill?",
    deleteConfirm:
      "“{name}” verrà rimossa definitivamente. Questa operazione non può essere annullata.",
  },

  // Libreria skill globali
  library: {
    searchPlaceholder: "Cerca skill…",
    importMd: "Importa .md",
    newSkill: "Nuova skill globale",
    loadError: "Impossibile caricare le skill",
    loadErrorRetry: "Riprova.",
    emptyTitle: "Ancora nessuna skill globale",
    emptyDescription:
      "Crea una skill riutilizzabile e indipendente dal progetto o importane una da un file Markdown.",
    noMatchesTitle: "Nessun risultato",
    noMatchesDescription: "Nessuna skill corrisponde alla ricerca.",
    exportAria: "Esporta skill",
    editAria: "Modifica skill",
    deleteAria: "Elimina skill",
    deleteTitle: "Eliminare questa skill?",
    deleteConfirm:
      "“{name}” verrà rimossa definitivamente dalla libreria globale. Questa operazione non può essere annullata.",
  },

  // Scheda skill
  card: {
    updated: "Aggiornata il {date}",
    hideContent: "Nascondi contenuto",
    viewContent: "Mostra contenuto",
  },

  // Finestra di creazione / modifica
  dialog: {
    editTitle: "Modifica skill",
    newTitle: "Nuova skill",
    description:
      "Le skill sono istruzioni riutilizzabili che Claude Code può integrare in un progetto.",
    scopeLabel: "Ambito",
    nameLabel: "Nome",
    namePlaceholder: "es. Pattern repository",
    descriptionLabel: "Descrizione",
    descriptionPlaceholder: "Una riga su quando usare questa skill",
    contentLabel: "Contenuto",
    contentHint: "(markdown)",
    contentPlaceholder: "## Linee guida\n\nScrivi qui le istruzioni riutilizzabili…",
    tagsLabel: "Tag",
    tagsHint: "(spazio o virgola)",
    tagsPlaceholder: "architettura, testing",
    createSkill: "Crea skill",
  },

  // Finestra di collegamento skill globali
  attach: {
    title: "Collega skill globali",
    description: "Scegli quali skill globali applicare a questo progetto.",
    searchPlaceholder: "Cerca skill globali…",
    loadError: "Impossibile caricare le skill",
    loadErrorRetry: "Riprova.",
    noMatchesTitle: "Nessun risultato",
    emptyTitle: "Ancora nessuna skill globale",
    noMatchesDescription: "Prova con una ricerca diversa.",
    emptyDescription: "Crea prima una skill globale nella libreria.",
  },

  // Finestra di importazione da Markdown
  upload: {
    title: "Importa skill da Markdown",
    descriptionPrefix: "Trascina un file ",
    descriptionSuffix: " con frontmatter (nome, descrizione, ambito).",
    untitled: "Senza titolo",
    changeFileAria: "Scegli un altro file",
    nameLabel: "Nome",
    descriptionLabel: "Descrizione",
    scopeLabel: "Ambito",
    tagsLabel: "Tag",
    tagsPlaceholder: "architettura, testing",
    attachAfterImport: "Collega a questo progetto dopo l’importazione",
    importSkill: "Importa skill",
    importing: "Importazione…",
  },

  // Area di rilascio file
  dropzone: {
    prompt: "Trascina un file .md o clicca per sfogliare",
    hint: "Il frontmatter viene analizzato automaticamente",
  },

  // Notifiche + validazione
  toasts: {
    detached: "“{name}” scollegata",
    detachError: "Impossibile scollegare la skill",
    deleted: "“{name}” eliminata",
    deleteError: "Impossibile eliminare la skill",
    attached: "“{name}” collegata",
    updateError: "Impossibile aggiornare la skill",
    skillCreated: "Skill creata",
    skillUpdated: "Skill aggiornata",
    saveError: "Impossibile salvare la skill",
    imported: "“{name}” importata",
    importError: "Impossibile importare la skill",
    chooseMd: "Scegli un file Markdown (.md)",
    readError: "Impossibile leggere il file",
    nameDescriptionRequired: "Nome e descrizione sono obbligatori",
  },
} as const;
