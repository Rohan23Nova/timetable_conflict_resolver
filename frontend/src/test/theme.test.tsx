import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../context/ThemeContext";

const TestThemeConsumer: React.FC = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
    </div>
  );
};

describe("Theme System & Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("respects stored theme from localStorage", () => {
    localStorage.setItem("slotwise_theme", "light");

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles theme and updates documentElement and localStorage", () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    // Initial theme
    const themeDisplay = screen.getByTestId("current-theme");
    const initialTheme = themeDisplay.textContent;

    // Toggle theme
    fireEvent.click(screen.getByText("Toggle Theme"));

    const expectedNewTheme = initialTheme === "dark" ? "light" : "dark";
    expect(themeDisplay).toHaveTextContent(expectedNewTheme);
    expect(localStorage.getItem("slotwise_theme")).toBe(expectedNewTheme);

    if (expectedNewTheme === "dark") {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    } else {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    }
  });

  it("sets specific theme directly", () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText("Set Light"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
    expect(localStorage.getItem("slotwise_theme")).toBe("light");

    fireEvent.click(screen.getByText("Set Dark"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    expect(localStorage.getItem("slotwise_theme")).toBe("dark");
  });
});
