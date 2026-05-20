import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "@/store/authContext";

import { Header } from "./Header";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

function defaultInvoke(command: string) {
  if (command === "evaluate_reminders") {
    return Promise.resolve({
      reminders: [],
      newReminders: [],
      dueReviewCount: 0,
      dailyGoalCards: 20,
      todayCardsReviewed: 0,
      currentStreak: 0,
      settings: {
        userId: 1,
        notificationEnabled: true,
        inAppRemindersEnabled: true,
        dueReviewNotificationsEnabled: true,
        streakNotificationsEnabled: true,
        reminderTime: "08:00",
        reminderDaysOfWeek: "1111111",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      evaluatedAt: "2026-01-01T00:00:00Z",
    });
  }

  return Promise.resolve(undefined);
}

beforeEach(() => {
  invokeMock.mockImplementation(defaultInvoke);
});

afterEach(() => {
  cleanup();
  invokeMock.mockReset();
});

const learnerAuth: AuthContextValue = {
  user: { userId: 1, username: "learner", role: "learner" },
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

const ownerAuth: AuthContextValue = {
  ...learnerAuth,
  user: { userId: 2, username: "owner", role: "owner" },
};

function renderHeader(
  path = "/discover",
  auth: AuthContextValue = learnerAuth,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={auth}>
        <Header />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location">{location.pathname + location.search}</span>
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

  it("Ctrl+K opens the command palette", async () => {
    renderHeader();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(
      screen.getByRole("dialog", { name: "Command Palette" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("searchbox", { name: "Command palette search" }),
      ).toHaveFocus();
    });
  });

  it("submits searches to the search results route", () => {
    render(
      <MemoryRouter initialEntries={["/discover"]}>
        <AuthContext.Provider value={learnerAuth}>
          <Header />
        </AuthContext.Provider>
        <LocationProbe />
      </MemoryRouter>,
    );
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.submit(input.closest("form")!);

    expect(screen.getByTestId("location")).toHaveTextContent("/search?q=hello");
  });
});

describe("Header command palette", () => {
  it("does not render Data Studio for learner accounts", () => {
    renderHeader("/discover", learnerAuth);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(
      screen.queryByRole("option", { name: /Data Studio/i }),
    ).not.toBeInTheDocument();
  });

  it("renders Data Studio for owner accounts", () => {
    renderHeader("/discover", ownerAuth);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(
      screen.getByRole("option", { name: /Data Studio/i }),
    ).toBeInTheDocument();
  });

  it("supports keyboard selection and navigation", () => {
    render(
      <MemoryRouter initialEntries={["/library"]}>
        <AuthContext.Provider value={learnerAuth}>
          <Header />
        </AuthContext.Provider>
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const palette = screen.getByRole("dialog", { name: "Command Palette" });

    fireEvent.keyDown(palette, { key: "ArrowDown" });
    fireEvent.keyDown(palette, { key: "Enter" });

    expect(screen.getByTestId("location")).toHaveTextContent("/discover");
  });

  it("includes offline search results from the search command", async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === "search") {
        return Promise.resolve({
          query: "hel",
          groups: [
            {
              resultType: "word",
              label: "Words",
              results: [
                {
                  resultType: "word",
                  id: 42,
                  title: "hello",
                  subtitle: "interjection",
                  snippet: "used as a greeting",
                  deckTitle: "Core English",
                  packTitle: "Starter",
                  score: 1.2,
                  route: "/word/42",
                },
              ],
            },
          ],
          total: 1,
          elapsedMs: 4,
        });
      }

      return defaultInvoke(command);
    });

    render(
      <MemoryRouter initialEntries={["/discover"]}>
        <AuthContext.Provider value={learnerAuth}>
          <Header />
        </AuthContext.Provider>
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Command palette search" }),
      { target: { value: "hel" } },
    );

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /hello/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("option", { name: /hello/i }));

    expect(screen.getByTestId("location")).toHaveTextContent("/word/42");
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
