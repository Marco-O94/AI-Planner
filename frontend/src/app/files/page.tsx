import { PageHeader } from "@/components/common";
import { FilesExplorer } from "@/components/files/files-explorer";

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
      <PageHeader
        title="File Explorer"
        description="Browse every saved file grouped by project, and search full-text inside file contents."
      />
      <FilesExplorer />
    </div>
  );
}
