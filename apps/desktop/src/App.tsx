import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "@/store/authContext";

import { router } from "./router";

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
