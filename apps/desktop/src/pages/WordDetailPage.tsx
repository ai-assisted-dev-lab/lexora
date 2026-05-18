import { BookMarked } from "lucide-react";
import { useParams } from "react-router-dom";

import { PlaceholderPage } from "./PlaceholderPage";

export function WordDetailPage() {
  const { wordId } = useParams<{ wordId: string }>();
  return (
    <PlaceholderPage
      title="Word Detail"
      description={`Full entry, senses, examples, and audio for word "${wordId}".`}
      Icon={BookMarked}
    />
  );
}
