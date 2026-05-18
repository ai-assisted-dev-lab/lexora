import { createHashRouter, Navigate } from "react-router-dom";

import { AppShellLayout } from "@/app/AppShellLayout";
import { OwnerRoute } from "@/guards/OwnerRoute";
import { ProtectedRoute } from "@/guards/ProtectedRoute";
import { AchievementsPage } from "@/pages/AchievementsPage";
import { AdminDataStudioPage } from "@/pages/AdminDataStudioPage";
import { DeckDetailPage } from "@/pages/DeckDetailPage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";
import { StudySessionPage } from "@/pages/StudySessionPage";
import { WeakWordsPage } from "@/pages/WeakWordsPage";
import { WordDetailPage } from "@/pages/WordDetailPage";

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
          { index: true, element: <Navigate to="/discover" replace /> },
          { path: "home", element: <Navigate to="/discover" replace /> },
          { path: "discover", element: <DiscoverPage /> },
          { path: "library", element: <LibraryPage /> },
          { path: "library/:deckId", element: <DeckDetailPage /> },
          { path: "word/:wordId", element: <WordDetailPage /> },
          { path: "review", element: <ReviewPage /> },
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
                element: <AdminDataStudioPage />,
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
