import "./pages.css";

import { Brain, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { Button, Card, EmptyState } from "@/components/ui";

export function ReviewPage() {
  return (
    <div className="review-page">
      <Card className="review-entry-card" variant="glass">
        <EmptyState
          title="Review"
          description="Start a real FSRS-powered flashcard session from due, weak, and new vocabulary cards."
          icon={<Brain size={32} aria-hidden="true" />}
          actions={
            <Button asChild variant="primary">
              <Link to="/study/session?mode=smart-review">
                <Play size={16} aria-hidden="true" />
                Start Smart Review
              </Link>
            </Button>
          }
        />
      </Card>
    </div>
  );
}
