import { SlidersHorizontal } from "lucide-react";

import { Button, Card } from "@/components/ui";

interface FilterGroupProps {
  label: string;
  options: string[];
  selected: string;
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  cefrLevels: string[];
  tags: string[];
  selectedCefrLevel: string;
  selectedTag: string;
  onCefrLevelChange: (value: string) => void;
  onTagChange: (value: string) => void;
}

function FilterGroup({ label, onChange, options, selected }: FilterGroupProps) {
  return (
    <div className="discover-filter-group">
      <p>{label}</p>
      <div className="discover-filter-group__options">
        {options.map((option) => (
          <Button
            aria-pressed={selected === option}
            key={option}
            onClick={() => onChange(option)}
            size="sm"
            variant={selected === option ? "primary" : "soft"}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function FilterBar({
  cefrLevels,
  onCefrLevelChange,
  onTagChange,
  selectedCefrLevel,
  selectedTag,
  tags,
}: FilterBarProps) {
  return (
    <Card className="discover-filter-bar" variant="glass">
      <div className="discover-filter-bar__title">
        <SlidersHorizontal size={18} aria-hidden="true" />
        <div>
          <h2>Filter catalog</h2>
          <p>Narrow decks by CEFR level or topic tag.</p>
        </div>
      </div>
      <FilterGroup
        label="CEFR"
        options={cefrLevels}
        selected={selectedCefrLevel}
        onChange={onCefrLevelChange}
      />
      <FilterGroup
        label="Tag"
        options={tags}
        selected={selectedTag}
        onChange={onTagChange}
      />
    </Card>
  );
}
