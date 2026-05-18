import { Button } from "@/components/ui";

import type { LibraryFilter } from "./types";

interface LibraryFilterBarProps {
  filters: LibraryFilter[];
  selectedFilter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
}

export function LibraryFilterBar({
  filters,
  onFilterChange,
  selectedFilter,
}: LibraryFilterBarProps) {
  return (
    <div className="library-filter-bar" aria-label="Library filters">
      {filters.map((filter) => (
        <Button
          aria-pressed={selectedFilter === filter}
          key={filter}
          type="button"
          variant={selectedFilter === filter ? "primary" : "soft"}
          onClick={() => onFilterChange(filter)}
        >
          {filter}
        </Button>
      ))}
    </div>
  );
}
