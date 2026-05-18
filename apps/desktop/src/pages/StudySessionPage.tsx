import { Timer } from "lucide-react";

import { PlaceholderPage } from "./PlaceholderPage";

export function StudySessionPage() {
  return (
    <PlaceholderPage
      title="Study Session"
      description="Active study session with timed or untimed card practice."
      Icon={Timer}
    />
  );
}
