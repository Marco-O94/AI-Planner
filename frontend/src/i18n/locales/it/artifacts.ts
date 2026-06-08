export const artifacts = {
  list: {
    untitledType: "Tipo senza titolo",
    updated: "Aggiornato {date}",
  },
  empty: {
    loadErrorTitle: "Impossibile caricare gli artefatti",
    loadErrorDescription:
      "Si è verificato un errore durante il recupero degli artefatti di questo progetto.",
    domainTitle: "Nessun artefatto in questo contesto",
    noneTitle: "Ancora nessun artefatto",
    noneDescription:
      "Genera un artefatto tipizzato dalle tue note e attività in Claude Code; comparirà qui una volta salvato.",
  },
  detail: {
    loadErrorTitle: "Impossibile caricare l'artefatto",
    loadErrorDescription:
      "L'artefatto potrebbe essere stato rimosso. Torna indietro e riprova.",
    backToList: "Torna all'elenco",
    allArtifacts: "Tutti gli artefatti",
    meta: "{type} · v{version} · aggiornato {updated}",
    tabs: {
      files: "File",
      versions: "Versioni e diff",
      checklist: "Checklist",
      sources: "Origini",
    },
    noFilesTitle: "Nessun file in questa versione",
    noFilesDescription:
      "Questa versione dell'artefatto non ha ancora file generati.",
    noSourcesTitle: "Nessuna origine collegata",
    noSourcesDescription:
      "Questa versione non è stata generata da note, attività o documenti tracciati.",
  },
  toolbar: {
    statusLabel: "Stato artefatto",
    statusChanged: "Artefatto contrassegnato come {status}",
    statusError: "Impossibile aggiornare lo stato",
    exportZip: "Esporta zip",
    openExport: "Apri esportazione",
  },
  files: {
    copyFile: "Copia file",
  },
  coverage: {
    title: "Copertura del manifest",
    complete: "Tutti i file dichiarati sono presenti.",
    partial: "{present} di {declared} file dichiarati presenti.",
    completeBadge: "Completa",
    incompleteBadge: "Incompleta",
    present: "Presenti",
    missing: "Mancanti",
    extra: "Aggiuntivi",
    countLabel: "{label} ({count})",
  },
  versions: {
    compare: "Confronta",
    baseVersion: "Versione base",
    targetVersion: "Versione di destinazione",
    versionLabel: "v{number}",
    versionLabelDated: "v{number} · {date}",
    onlyOneTitle: "Una sola versione",
    onlyOneDescription:
      "I diff compaiono dopo la generazione di una seconda versione di questo artefatto.",
    noFilesTitle: "Nessun file da confrontare",
    noFilesDescription:
      "Nessuna delle due versioni contiene file nelle revisioni selezionate.",
  },
  diff: {
    noDifferences: "Nessuna differenza tra queste versioni.",
  },
  phases: {
    statusChanged: "Fase contrassegnata come {status}",
    statusError: "Impossibile aggiornare la fase",
    statusLabel: "Imposta lo stato per {title}",
    noPhasesTitle: "Nessuna fase di esecuzione",
    noPhasesDescription:
      "Questo artefatto non dichiara una checklist di esecuzione.",
    checklistTitle: "Checklist di esecuzione",
    progress: "{done} / {total} completate",
  },
  sources: {
    title: "Elementi di origine",
    notes: "Note",
    tasks: "Attività",
    documents: "Documenti",
    countLabel: "{label} ({count})",
  },
} as const;
