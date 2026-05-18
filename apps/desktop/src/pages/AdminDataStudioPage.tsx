import { ShieldCheck } from "lucide-react";

import { PlaceholderPage } from "./PlaceholderPage";

export function AdminDataStudioPage() {
  return (
    <PlaceholderPage
      title="Data Studio"
      description="Owner-only content management: packs, decks, words, and media. Not accessible to learner accounts."
      Icon={ShieldCheck}
    />
  );
}
