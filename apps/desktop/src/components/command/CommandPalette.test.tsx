import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "@/store/authContext";

import { CommandPalette } from "./CommandPalette";

const searchMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/commands/search", () => ({
  search: searchMock,
}));

const ownerAuth: AuthContextValue = {
  user: { userId: 1, username: "owner", role: "owner" },
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
};

const learnerAuth: AuthContextValue = {
  ...ownerAuth,
  user: { userId: 2, username: "learner", role: "learner" },
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderPalette(auth: AuthContextValue = ownerAuth) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/home"]}>
        <CommandPalette />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CommandPalette", () => {
  it("opens with Ctrl+K and navigates with a command", async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard("{Control>}k{/Control}");

    expect(
      screen.getByRole("dialog", { name: "Command Palette" }),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Review"));

    expect(screen.getByTestId("location")).toHaveTextContent("/review");
  });

  it("keeps owner-only Data Studio out of learner results", async () => {
    const user = userEvent.setup();
    renderPalette(learnerAuth);

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByLabelText("Command palette search"), "data");

    expect(screen.queryByText("Data Studio")).not.toBeInTheDocument();
  });

  it("shows Data Studio to owners", async () => {
    const user = userEvent.setup();
    renderPalette(ownerAuth);

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByLabelText("Command palette search"), "data");

    expect(screen.getByText("Data Studio")).toBeInTheDocument();
  });

  it("merges offline search results into the palette", async () => {
    const user = userEvent.setup();
    searchMock.mockResolvedValue({
      query: "ru",
      total: 1,
      elapsedMs: 3,
      groups: [
        {
          resultType: "word",
          label: "Words",
          results: [
            {
              resultType: "word",
              id: 10,
              title: "run",
              subtitle: "verb A1",
              snippet: "chay nhanh bang chan",
              deckTitle: "Everyday Actions",
              packTitle: "English Essentials",
              score: 98,
              route: "/word/10",
            },
          ],
        },
      ],
    });
    renderPalette();

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByLabelText("Command palette search"), "ru");

    await waitFor(() => {
      expect(searchMock).toHaveBeenCalledWith("ru", { limit: 6 });
    });
    expect(await screen.findByText("run")).toBeInTheDocument();
    expect(screen.getByText("Word")).toBeInTheDocument();
  });
});
