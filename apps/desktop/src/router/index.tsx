import { lazy, Suspense } from "react";
import { createHashRouter, Navigate } from "react-router-dom";

import { AppShellLayout } from "@/app/AppShellLayout";
import { OwnerRoute } from "@/guards/OwnerRoute";
import { ProtectedRoute } from "@/guards/ProtectedRoute";
import { AchievementsPage } from "@/pages/AchievementsPage";
import { DeckDetailPage } from "@/pages/DeckDetailPage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { HomePage } from "@/pages/HomePage";
import { LibraryPage } from "@/pages/LibraryPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { SearchPage } from "@/pages/SearchPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";
import { StudySessionPage } from "@/pages/StudySessionPage";
import { WeakWordsPage } from "@/pages/WeakWordsPage";
import { WordDetailPage } from "@/pages/WordDetailPage";

const AdminDataStudioPage = lazy(() =>
  import("@/pages/AdminDataStudioPage").then((module) => ({
    default: module.AdminDataStudioPage,
  })),
);

function RouteLoading({ label }: { label: string }) {
  return (
    <div className="page-shell" role="status" aria-label={label}>
      {label}
    </div>
  );
}

/**
 * Route tree exported separately so tests can use createMemoryRouter
 * with the same route definitions as the real app.
 */
export const routeTree = [
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShellLayout />,
        children: [
          { index: true, element: <Navigate to="/home" replace /> },
          { path: "home", element: <HomePage /> },
          { path: "discover", element: <DiscoverPage /> },
          { path: "library", element: <LibraryPage /> },
          { path: "library/:deckId", element: <DeckDetailPage /> },
          { path: "word/:wordId", element: <WordDetailPage /> },
          { path: "review", element: <ReviewPage /> },
          { path: "search", element: <SearchPage /> },
          { path: "study/session", element: <StudySessionPage /> },
          { path: "weak-words", element: <WeakWordsPage /> },
          { path: "achievements", element: <AchievementsPage /> },
          { path: "stats", element: <StatsPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "settings", element: <SettingsPage /> },
          {
            element: <OwnerRoute />,
            children: [
              {
                path: "admin/data-studio",
                element: (
                  <Suspense
                    fallback={<RouteLoading label="Loading Data Studio" />}
                  >
                    <AdminDataStudioPage />
                  </Suspense>
                ),
              },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createHashRouter(routeTree);
