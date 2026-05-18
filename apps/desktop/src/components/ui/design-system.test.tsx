import { render, screen } from "@testing-library/react";
import { BookOpen } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  PageContainer,
  PageHeader,
  ProgressBar,
  SectionHeader,
  StatCard,
} from "@/components/ui";

describe("design system primitives", () => {
  it("renders button variants with shared primitive classes", () => {
    render(
      <>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <IconButton label="Open tools">
          <BookOpen aria-hidden="true" size={16} />
        </IconButton>
      </>,
    );

    expect(screen.getByRole("button", { name: "Primary" })).toHaveClass(
      "lx-button",
      "lx-button--primary",
    );
    expect(screen.getByRole("button", { name: "Secondary" })).toHaveClass(
      "lx-button--secondary",
    );
    expect(screen.getByRole("button", { name: "Open tools" })).toHaveClass(
      "lx-icon-button",
    );
  });

  it("renders card and badge variants", () => {
    render(
      <Card variant="glass">
        <Badge variant="success">Installed</Badge>
      </Card>,
    );

    expect(screen.getByText("Installed").parentElement).toHaveClass(
      "lx-card--glass",
    );
    expect(screen.getByText("Installed")).toHaveClass("lx-badge--success");
  });

  it("exposes accessible progress values", () => {
    render(<ProgressBar label="Daily goal" max={20} value={7} />);

    const progress = screen.getByRole("progressbar", { name: "Daily goal" });
    expect(progress).toHaveAttribute("aria-valuemax", "20");
    expect(progress).toHaveAttribute("aria-valuenow", "7");
  });

  it("renders page, section, empty, and stat primitives", () => {
    render(
      <PageContainer>
        <PageHeader>Header area</PageHeader>
        <SectionHeader
          eyebrow="Library"
          title="Continue Learning"
          description="Decks you opened recently."
        />
        <EmptyState title="No decks" description="Add a deck to begin." />
        <StatCard label="XP" value="120" meta="Level 2" />
      </PageContainer>,
    );

    expect(screen.getByText("Header area")).toHaveClass("lx-page-header");
    expect(
      screen.getByRole("heading", { name: "Continue Learning" }),
    ).toHaveClass("lx-section-header__title");
    expect(screen.getByRole("heading", { name: "No decks" })).toHaveClass(
      "lx-empty-state__title",
    );
    expect(screen.getByText("120")).toHaveClass("lx-stat-card__value");
  });
});
