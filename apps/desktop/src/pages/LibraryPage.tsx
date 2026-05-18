import { BookOpen } from "lucide-react";

import { PlaceholderPage } from "./PlaceholderPage";

export function LibraryPage() {
  return (
    <PlaceholderPage
      title="My Library"
      description="All the decks you have installed, sorted by recent activity."
      Icon={BookOpen}
    />
  );
}
