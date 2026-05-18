import { SlidersHorizontal } from "lucide-react";

import { Button, Card } from "@/components/ui";

import type { CatalogFilter } from "./types";

interface FilterGroupProps {
  label: string;
  options: CatalogFilter[];
  selected: CatalogFilter;
  onChange: (value: CatalogFilter) => void;
}

interface FilterBarProps {
  categories: CatalogFilter[];
  cefrLevels: CatalogFilter[];
  topics: CatalogFilter[];
  selectedCategory: CatalogFilter;
  selectedCefrLevel: CatalogFilter;
  selectedTopic: CatalogFilter;
  onCategoryChange: (value: CatalogFilter) => void;
  onCefrLevelChange: (value: CatalogFilter) => void;
  onTopicChange: (value: CatalogFilter) => void;
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
  categories,
  cefrLevels,
  onCategoryChange,
  onCefrLevelChange,
  onTopicChange,
  selectedCategory,
  selectedCefrLevel,
  selectedTopic,
  topics,
}: FilterBarProps) {
  return (
    <Card className="discover-filter-bar" variant="glass">
      <div className="discover-filter-bar__title">
        <SlidersHorizontal size={18} aria-hidden="true" />
        <div>
          <h2>Filter catalog</h2>
          <p>Preview how local deck metadata can narrow the catalog.</p>
        </div>
      </div>
      <FilterGroup
        label="Goal"
        options={categories}
        selected={selectedCategory}
        onChange={onCategoryChange}
      />
      <FilterGroup
        label="CEFR"
        options={cefrLevels}
        selected={selectedCefrLevel}
        onChange={onCefrLevelChange}
      />
      <FilterGroup
        label="Topic"
        options={topics}
        selected={selectedTopic}
        onChange={onTopicChange}
      />
    </Card>
  );
}
