import { AlertCircle } from "lucide-react";

import { PlaceholderPage } from "./PlaceholderPage";

export function WeakWordsPage() {
  return (
    <PlaceholderPage
      title="Weak Words"
      description="Words with low retention scores that need extra attention."
      Icon={AlertCircle}
    />
  );
}
