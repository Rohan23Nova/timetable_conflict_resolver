import React from "react";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { router } from "@/routes";

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
