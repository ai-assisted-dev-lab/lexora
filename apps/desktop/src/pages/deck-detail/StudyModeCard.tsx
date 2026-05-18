import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";

import type { StudyMode } from "./types";

interface StudyModeCardProps {
  mode: StudyMode;
}

export function StudyModeCard({ mode }: StudyModeCardProps) {
  const Icon = mode.Icon;

  return (
    <motion.article whileHover={{ y: -3 }} transition={{ duration: 0.16 }}>
      <Card className="study-mode-card" variant="interactive">
        <div className="study-mode-card__icon">
          <Icon size={22} aria-hidden="true" />
        </div>
        <div>
          <div className="study-mode-card__header">
            <h3>{mode.title}</h3>
            <Badge variant="muted">{mode.estimate}</Badge>
          </div>
          <p>{mode.description}</p>
        </div>
        <Button
          aria-label={`${mode.title} placeholder`}
          className="study-mode-card__action"
          type="button"
          variant="ghost"
        >
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </Card>
    </motion.article>
  );
}
