import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { Header } from "./Header";

afterEach(cleanup);

function renderHeader(path = "/discover") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );
}

describe("Header page title", () => {
  it("shows the label for the current route", () => {
    renderHeader("/library");
    expect(
      screen.getByRole("heading", { level: 1, name: "My Library" }),
    ).toBeInTheDocument();
  });

  it("shows Lexora for an unknown route", () => {
    renderHeader("/does-not-exist");
    expect(
      screen.getByRole("heading", { level: 1, name: "Lexora" }),
    ).toBeInTheDocument();
  });
});

describe("Header search bar", () => {
  it("renders search input with correct accessible label", () => {
    renderHeader();
    expect(
      screen.getByRole("searchbox", { name: "Search words, decks, topics" }),
    ).toBeInTheDocument();
  });

  it("renders the correct placeholder text", () => {
    renderHeader();
    expect(
      screen.getByPlaceholderText("Search words, decks, topics..."),
    ).toBeInTheDocument();
  });

  it("renders the Ctrl+K keyboard shortcut hint", () => {
    renderHeader();
    const hint = document.querySelector(".search-bar__kbd");
    expect(hint).toBeInTheDocument();
    const keys = hint?.querySelectorAll("kbd");
    expect(keys).toHaveLength(2);
    expect(keys?.[0].textContent).toBe("Ctrl");
    expect(keys?.[1].textContent).toBe("K");
  });

  it("Ctrl+K focuses the search input", () => {
    renderHeader();
    const input = screen.getByRole("searchbox");
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(input);
  });
});

describe("Header notifications", () => {
  it("renders the notification button", () => {
    renderHeader();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
  });

  it("does not render a badge when there are no notifications", () => {
    renderHeader();
    expect(
      document.querySelector(".page-header__badge"),
    ).not.toBeInTheDocument();
  });
});

describe("Header user profile", () => {
  it("renders the profile button", () => {
    renderHeader();
    expect(
      screen.getByRole("button", { name: /open menu for/i }),
    ).toBeInTheDocument();
  });

  it("shows the display name", () => {
    renderHeader();
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("shows the role subtitle", () => {
    renderHeader();
    expect(screen.getByText("Learner")).toBeInTheDocument();
  });

  it("renders the dropdown chevron inside the profile button", () => {
    renderHeader();
    const profileBtn = screen.getByRole("button", { name: /open menu for/i });
    expect(profileBtn.querySelector("svg")).toBeInTheDocument();
  });
});
