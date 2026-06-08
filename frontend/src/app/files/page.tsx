import { FilesExplorer } from "@/components/files/files-explorer";
import { FilesPageHeader } from "@/components/files/files-page-header";

export const metadata = {
  title: "Files",
  description: "Browse saved files by project and search inside their contents.",
};

/**
 * File Explorer surface (/files). Lists every saved file (documents + artifact
 * files + notes) grouped by project, with debounced in-content search across
 * exact / by-meaning / hybrid modes, plus kind and tag filters and a viewer.
 */
export default function FilesPage() {
  return (
    <div className="space-y-8">
      <FilesPageHeader />
      <FilesExplorer />
    </div>
  );
}
