/**
 * i18n dictionary barrel.
 *
 * Each UI surface owns a namespace file under `locales/{en,it}/<namespace>.ts`
 * (so parallel translation work never edits the same file). This barrel merges
 * them into the two locale dictionaries. Translation passes edit the namespace
 * files only — never this barrel.
 */

import { artifactTypes as enArtifactTypes } from "./locales/en/artifactTypes";
import { artifacts as enArtifacts } from "./locales/en/artifacts";
import { common as enCommon } from "./locales/en/common";
import { dashboard as enDashboard } from "./locales/en/dashboard";
import { documents as enDocuments } from "./locales/en/documents";
import { enums as enEnums } from "./locales/en/enums";
import { files as enFiles } from "./locales/en/files";
import { markdownEditor as enMarkdownEditor } from "./locales/en/markdownEditor";
import { nav as enNav } from "./locales/en/nav";
import { notes as enNotes } from "./locales/en/notes";
import { noteTypes as enNoteTypes } from "./locales/en/noteTypes";
import { project as enProject } from "./locales/en/project";
import { settings as enSettings } from "./locales/en/settings";
import { skills as enSkills } from "./locales/en/skills";
import { tasks as enTasks } from "./locales/en/tasks";
import { technologies as enTechnologies } from "./locales/en/technologies";
import { templates as enTemplates } from "./locales/en/templates";

import { artifactTypes as itArtifactTypes } from "./locales/it/artifactTypes";
import { artifacts as itArtifacts } from "./locales/it/artifacts";
import { common as itCommon } from "./locales/it/common";
import { dashboard as itDashboard } from "./locales/it/dashboard";
import { documents as itDocuments } from "./locales/it/documents";
import { enums as itEnums } from "./locales/it/enums";
import { files as itFiles } from "./locales/it/files";
import { markdownEditor as itMarkdownEditor } from "./locales/it/markdownEditor";
import { nav as itNav } from "./locales/it/nav";
import { notes as itNotes } from "./locales/it/notes";
import { noteTypes as itNoteTypes } from "./locales/it/noteTypes";
import { project as itProject } from "./locales/it/project";
import { settings as itSettings } from "./locales/it/settings";
import { skills as itSkills } from "./locales/it/skills";
import { tasks as itTasks } from "./locales/it/tasks";
import { technologies as itTechnologies } from "./locales/it/technologies";
import { templates as itTemplates } from "./locales/it/templates";

export type Locale = "en" | "it";

export const LOCALES: Locale[] = ["en", "it"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  it: "IT",
};

/** Native language names, shown in the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
};

const en = {
  common: enCommon,
  nav: enNav,
  enums: enEnums,
  dashboard: enDashboard,
  project: enProject,
  notes: enNotes,
  noteTypes: enNoteTypes,
  settings: enSettings,
  tasks: enTasks,
  documents: enDocuments,
  artifacts: enArtifacts,
  skills: enSkills,
  templates: enTemplates,
  technologies: enTechnologies,
  artifactTypes: enArtifactTypes,
  files: enFiles,
  markdownEditor: enMarkdownEditor,
};

const it = {
  common: itCommon,
  nav: itNav,
  enums: itEnums,
  dashboard: itDashboard,
  project: itProject,
  notes: itNotes,
  noteTypes: itNoteTypes,
  settings: itSettings,
  tasks: itTasks,
  documents: itDocuments,
  artifacts: itArtifacts,
  skills: itSkills,
  templates: itTemplates,
  technologies: itTechnologies,
  artifactTypes: itArtifactTypes,
  files: itFiles,
  markdownEditor: itMarkdownEditor,
};

export const dictionaries: Record<Locale, Record<string, unknown>> = { en, it };
