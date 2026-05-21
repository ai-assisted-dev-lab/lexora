import { RouterProvider } from "react-router-dom";

import { ErrorBoundary, ToastProvider } from "@/components/feedback";
import { AuthProvider } from "@/store/authContext";

import { router } from "./router";

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
