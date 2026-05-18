import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { Sidebar } from "./Sidebar";

afterEach(cleanup);

function renderSidebar(path = "/discover") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar — brand block", () => {
  it("renders the Lexora wordmark", () => {
    renderSidebar();
    expect(screen.getByText("Lexora")).toBeInTheDocument();
  });

  it("renders the EN ↔ VI subtitle", () => {
    renderSidebar();
    expect(screen.getByText("EN ↔ VI")).toBeInTheDocument();
  });
});

describe("Sidebar — nav items", () => {
  it("renders all main nav labels", () => {
    renderSidebar();
    expect(screen.getByText("Discover")).toBeInTheDocument();
    expect(screen.getByText("My Library")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Stats")).toBeInTheDocument();
    expect(screen.getByText("Achievements")).toBeInTheDocument();
  });

  it("renders the Settings bottom nav item", () => {
    renderSidebar();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("marks the active route with aria-current", () => {
    renderSidebar("/library");
    expect(screen.getByRole("link", { name: /my library/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not mark inactive routes with aria-current", () => {
    renderSidebar("/discover");
    expect(
      screen.getByRole("link", { name: /my library/i }),
    ).not.toHaveAttribute("aria-current");
  });
});

describe("Sidebar — collapse behavior", () => {
  it("renders the collapse toggle button when expanded", () => {
    renderSidebar();
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });

  it("collapses on toggle click", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });

  it("hides nav labels when collapsed", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.queryByText("Discover")).not.toBeInTheDocument();
  });

  it("collapsed nav items carry title attributes for tooltips", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute(
      "title",
      "Discover",
    );
  });

  it("re-expands on second toggle click", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByText("Discover")).toBeInTheDocument();
  });

  it("auto-collapses when window is resized below breakpoint", async () => {
    renderSidebar();
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 800,
    });
    fireEvent(window, new Event("resize"));
    expect(
      await screen.findByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });
});

describe("Sidebar — profile card", () => {
  it("renders the profile mini card", () => {
    renderSidebar();
    expect(screen.getByTestId("sidebar-profile")).toBeInTheDocument();
  });
});
