export type Theme = "light" | "dark";

export function preferredTheme(prefersDark: boolean): Theme {
  return prefersDark ? "dark" : "light";
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
}
