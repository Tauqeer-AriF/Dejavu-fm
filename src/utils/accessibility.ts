export type ContrastMode = "standard" | "high-dark" | "high-light" | "neon";
export type TextSize = "normal" | "large";

export const ACCESSIBILITY_CLASSES = [
  "contrast-high-dark",
  "contrast-high-light",
  "contrast-neon",
  "text-size-large",
  "accessibility-dyslexic",
];

export function applyFrontAccessibilityOptions() {
  if (typeof window === "undefined") return;
  const html = document.documentElement;

  // Make sure admin view flag is removed when on front pages
  html.classList.remove("in-admin-view");

  // Remove existing contrast classes
  html.classList.remove("contrast-high-dark", "contrast-high-light", "contrast-neon", "light");

  // Apply saved Contrast Mode
  const mode = (localStorage.getItem("contrast_mode") as ContrastMode) || "standard";
  if (mode === "high-dark") {
    html.classList.add("contrast-high-dark");
  } else if (mode === "high-light") {
    html.classList.add("contrast-high-light", "light");
  } else if (mode === "neon") {
    html.classList.add("contrast-neon");
  } else {
    // Standard mode: check saved theme for front view
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      html.classList.add("light");
    }
  }

  // Apply saved Text Size
  html.classList.remove("text-size-large", "text-size-extra");
  let textSize = (localStorage.getItem("accessibility_text_size") as any) || "normal";
  if (textSize === "extra") {
    textSize = "large";
    localStorage.setItem("accessibility_text_size", "large");
  }
  if (textSize === "large") {
    html.classList.add("text-size-large");
  }

  // Apply saved Dyslexia-friendly font
  const savedDyslexic = localStorage.getItem("accessibility_dyslexic") === "true";
  if (savedDyslexic) {
    html.classList.add("accessibility-dyslexic");
  } else {
    html.classList.remove("accessibility-dyslexic");
  }
}

export function suppressAccessibilityForAdmin() {
  if (typeof window === "undefined") return;
  const html = document.documentElement;

  html.classList.add("in-admin-view");
  html.classList.remove(
    "contrast-high-dark",
    "contrast-high-light",
    "contrast-neon",
    "text-size-large",
    "text-size-extra",
    "accessibility-dyslexic",
    "light" // Front light mode removed so admin-light-mode / admin dark mode works natively
  );
}
