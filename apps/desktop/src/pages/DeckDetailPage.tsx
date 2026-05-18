import { Layers } from "lucide-react";
import { useParams } from "react-router-dom";

import { PlaceholderPage } from "./PlaceholderPage";

export function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  return (
    <PlaceholderPage
      title="Deck Detail"
      description={`Details and word list for deck "${deckId}".`}
      Icon={Layers}
    />
  );
}
