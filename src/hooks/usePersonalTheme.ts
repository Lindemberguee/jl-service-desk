import { useEffect, useCallback, useState } from 'react';

export interface ThemePreset {
  id: string;
  label: string;
  primary: string;
  accent: string;
  sidebar: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'default', label: 'Azul Corporativo', primary: '#3B82F6', accent: '#8B5CF6', sidebar: '#1E293B' },
  { id: 'emerald', label: 'Esmeralda', primary: '#10B981', accent: '#06B6D4', sidebar: '#0F1F1A' },
  { id: 'rose', label: 'Rosé', primary: '#F43F5E', accent: '#EC4899', sidebar: '#1F0F14' },
  { id: 'amber', label: 'Âmbar', primary: '#F59E0B', accent: '#EF4444', sidebar: '#1A170E' },
  { id: 'violet', label: 'Violeta', primary: '#8B5CF6', accent: '#6366F1', sidebar: '#14101F' },
  { id: 'teal', label: 'Teal', primary: '#14B8A6', accent: '#0EA5E9', sidebar: '#0E1A1A' },
  { id: 'orange', label: 'Laranja', primary: '#F97316', accent: '#FB923C', sidebar: '#1A130E' },
  { id: 'slate', label: 'Grafite', primary: '#64748B', accent: '#94A3B8', sidebar: '#111318' },
  { id: 'midnight', label: 'Meia-noite', primary: '#1E293B', accent: '#475569', sidebar: '#0B0F19' },
  { id: 'crimson', label: 'Carmesim', primary: '#DC2626', accent: '#F97316', sidebar: '#1A0A0A' },
  { id: 'ocean', label: 'Oceano', primary: '#0284C7', accent: '#22D3EE', sidebar: '#0A1628' },
  { id: 'forest', label: 'Floresta', primary: '#15803D', accent: '#84CC16', sidebar: '#0A1A0F' },
];

export interface PersonalTheme {
  presetId: string | null;
  primary: string;
  accent: string;
  sidebar: string;
}

export interface SavedTheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
  sidebar: string;
  createdAt: number;
}

const STORAGE_KEY = 'serviceos-personal-theme';
const SAVED_THEMES_KEY = 'serviceos-saved-themes';

function getStoredTheme(): PersonalTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getSavedThemes(): SavedTheme[] {
  try {
    const raw = localStorage.getItem(SAVED_THEMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomTheme(name: string, primary: string, accent: string, sidebar: string): SavedTheme {
  const themes = getSavedThemes();
  const newTheme: SavedTheme = {
    id: `custom-${Date.now()}`,
    name,
    primary,
    accent,
    sidebar,
    createdAt: Date.now(),
  };
  themes.push(newTheme);
  localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(themes));
  return newTheme;
}

export function deleteSavedTheme(id: string) {
  const themes = getSavedThemes().filter(t => t.id !== id);
  localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(themes));
}

function hexToHslParts(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function applyThemeToDOM(theme: PersonalTheme) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');

  const pp = hexToHslParts(theme.primary);
  const ap = hexToHslParts(theme.accent);
  const sp = hexToHslParts(theme.sidebar);

  if (!pp) return;

  const { h: ph, s: ps } = pp;
  const isAchromatic = ps < 10;

  // ── Primary ───────────────────────────────────────────────────
  const primaryL = isAchromatic
    ? (isDark ? clamp(pp.l, 55, 80) : clamp(pp.l, 15, 45))
    : (isDark ? clamp(pp.l, 45, 65) : clamp(pp.l, 30, 50));
  const primaryS = isAchromatic ? ps : clamp(ps, 40, 100);

  root.style.setProperty('--primary', `${ph} ${primaryS}% ${primaryL}%`);
  root.style.setProperty('--primary-foreground', primaryL > 55 ? `${ph} 10% 5%` : `${ph} 10% 98%`);
  root.style.setProperty('--ring', `${ph} ${primaryS}% ${primaryL}%`);

  // ── Tint ──────────────────────────────────────────────────────
  const tintS = isAchromatic ? clamp(ps, 0, 5) : clamp(ps, 8, 25);

  // ── Surfaces ──────────────────────────────────────────────────
  if (isDark) {
    root.style.setProperty('--background', `${ph} ${clamp(tintS * 1.5, 0, 30)}% 4%`);
    root.style.setProperty('--foreground', `${ph} ${clamp(tintS, 0, 15)}% 91%`);
    root.style.setProperty('--card', `${ph} ${clamp(tintS * 1.2, 0, 25)}% 7%`);
    root.style.setProperty('--card-foreground', `${ph} ${clamp(tintS, 0, 15)}% 91%`);
    root.style.setProperty('--popover', `${ph} ${clamp(tintS * 1.2, 0, 25)}% 7%`);
    root.style.setProperty('--popover-foreground', `${ph} ${clamp(tintS, 0, 15)}% 91%`);
    root.style.setProperty('--secondary', `${ph} ${clamp(tintS, 0, 20)}% 14%`);
    root.style.setProperty('--secondary-foreground', `${ph} ${clamp(tintS, 0, 15)}% 91%`);
    root.style.setProperty('--muted', `${ph} ${clamp(tintS * 0.8, 0, 15)}% 11%`);
    root.style.setProperty('--muted-foreground', `${ph} ${clamp(tintS * 0.5, 0, 10)}% 55%`);
    root.style.setProperty('--border', `${ph} ${clamp(tintS, 0, 20)}% 14%`);
    root.style.setProperty('--input', `${ph} ${clamp(tintS, 0, 20)}% 16%`);
  } else {
    root.style.setProperty('--background', `${ph} ${clamp(tintS, 0, 20)}% ${isAchromatic ? 97 : 98}%`);
    root.style.setProperty('--foreground', `${ph} ${clamp(tintS * 1.5, 0, 30)}% 11%`);
    root.style.setProperty('--card', `${ph} ${clamp(tintS * 0.5, 0, 10)}% 100%`);
    root.style.setProperty('--card-foreground', `${ph} ${clamp(tintS * 1.5, 0, 30)}% 11%`);
    root.style.setProperty('--popover', `${ph} ${clamp(tintS * 0.5, 0, 10)}% 100%`);
    root.style.setProperty('--popover-foreground', `${ph} ${clamp(tintS * 1.5, 0, 30)}% 11%`);
    root.style.setProperty('--secondary', `${ph} ${clamp(tintS, 0, 16)}% 93%`);
    root.style.setProperty('--secondary-foreground', `${ph} ${clamp(tintS * 1.5, 0, 30)}% 20%`);
    root.style.setProperty('--muted', `${ph} ${clamp(tintS * 0.8, 0, 15)}% 96%`);
    root.style.setProperty('--muted-foreground', `${ph} ${clamp(tintS * 0.5, 0, 10)}% 46%`);
    root.style.setProperty('--border', `${ph} ${clamp(tintS, 0, 18)}% 90%`);
    root.style.setProperty('--input', `${ph} ${clamp(tintS, 0, 18)}% 90%`);
  }

  // ── Accent ────────────────────────────────────────────────────
  // The accent color now properly tints interactive backgrounds
  if (ap) {
    const { h: ah, s: rawAs } = ap;
    const accentIsAchromatic = rawAs < 10;
    const as = accentIsAchromatic ? rawAs : clamp(rawAs, 20, 100);
    const accentL = isDark ? clamp(ap.l, 45, 65) : clamp(ap.l, 30, 50);

    // Accent background: subtle tint of the accent color (used for hover states, etc.)
    const accentBgS = accentIsAchromatic ? clamp(rawAs, 0, 5) : clamp(rawAs, 10, 40);
    const accentBgL = isDark ? 14 : 93;
    root.style.setProperty('--accent', `${ah} ${accentBgS}% ${accentBgL}%`);
    root.style.setProperty('--accent-foreground', `${ah} ${as}% ${isDark ? 91 : 11}%`);

    // Charts using accent
    root.style.setProperty('--chart-3', `${ah} ${as}% ${accentL}%`);
    root.style.setProperty('--chart-4', `${ah} ${clamp(as - 15, 15, 100)}% ${isDark ? 40 : 55}%`);
  }

  // ── Charts ────────────────────────────────────────────────────
  root.style.setProperty('--chart-1', `${ph} ${primaryS}% ${primaryL}%`);
  root.style.setProperty('--chart-2', `${ph} ${clamp(primaryS - 20, 10, 100)}% ${isDark ? 45 : 48}%`);
  root.style.setProperty('--chart-5', `${(ph + 180) % 360} ${clamp(primaryS - 10, 15, 80)}% ${isDark ? 50 : 42}%`);

  // ── Sidebar ───────────────────────────────────────────────────
  if (sp) {
    const { h: sh, s: rawSs, l: rawSl } = sp;
    const sidebarIsAchromatic = rawSs < 10;
    const ss = sidebarIsAchromatic ? clamp(rawSs, 0, 8) : clamp(rawSs, 20, 60);
    const sl = clamp(rawSl, 3, 18);
    root.style.setProperty('--sidebar-background', `${sh} ${ss}% ${sl}%`);
    root.style.setProperty('--sidebar-foreground', `${sh} ${clamp(ss * 0.6, 0, 31)}% 91%`);
    root.style.setProperty('--sidebar-primary', `${ph} ${primaryS}% ${clamp(primaryL + 10, 45, 70)}%`);
    root.style.setProperty('--sidebar-primary-foreground', `0 0% 100%`);
    root.style.setProperty('--sidebar-accent', `${sh} ${ss}% ${clamp(sl + 5, 8, 22)}%`);
    root.style.setProperty('--sidebar-accent-foreground', `${sh} ${clamp(ss * 0.6, 0, 31)}% 91%`);
    root.style.setProperty('--sidebar-border', `${sh} ${ss}% ${clamp(sl + 7, 10, 25)}%`);
    root.style.setProperty('--sidebar-ring', `${ph} ${primaryS}% ${clamp(primaryL + 10, 45, 70)}%`);
    root.style.setProperty('--sidebar-muted-foreground', `${sh} ${clamp(ss * 0.3, 0, 15)}% 55%`);
  }
}

function clearThemeFromDOM() {
  const root = document.documentElement;
  const vars = [
    '--primary', '--primary-foreground', '--ring',
    '--background', '--foreground',
    '--card', '--card-foreground',
    '--popover', '--popover-foreground',
    '--secondary', '--secondary-foreground',
    '--muted', '--muted-foreground',
    '--accent', '--accent-foreground',
    '--border', '--input',
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
    '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring', '--sidebar-muted-foreground',
  ];
  vars.forEach(v => root.style.removeProperty(v));
}

export function usePersonalTheme() {
  const [theme, setThemeState] = useState<PersonalTheme | null>(getStoredTheme);
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(getSavedThemes);

  useEffect(() => {
    if (theme) {
      applyThemeToDOM(theme);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } else {
      clearThemeFromDOM();
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [theme]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = getStoredTheme();
      if (current) applyThemeToDOM(current);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const setTheme = useCallback((preset: ThemePreset | null) => {
    if (!preset) {
      setThemeState(null);
      return;
    }
    setThemeState({
      presetId: preset.id,
      primary: preset.primary,
      accent: preset.accent,
      sidebar: preset.sidebar,
    });
  }, []);

  const setCustomColors = useCallback((primary: string, accent: string, sidebar: string) => {
    setThemeState({
      presetId: 'custom',
      primary,
      accent,
      sidebar,
    });
  }, []);

  const saveTheme = useCallback((name: string) => {
    if (!theme) return null;
    const saved = saveCustomTheme(name, theme.primary, theme.accent, theme.sidebar);
    setSavedThemes(getSavedThemes());
    return saved;
  }, [theme]);

  const removeSavedTheme = useCallback((id: string) => {
    deleteSavedTheme(id);
    setSavedThemes(getSavedThemes());
  }, []);

  const applySavedTheme = useCallback((saved: SavedTheme) => {
    setThemeState({
      presetId: saved.id,
      primary: saved.primary,
      accent: saved.accent,
      sidebar: saved.sidebar,
    });
  }, []);

  return {
    currentTheme: theme,
    currentPresetId: theme?.presetId || 'default',
    setTheme,
    setCustomColors,
    presets: THEME_PRESETS,
    savedThemes,
    saveTheme,
    removeSavedTheme,
    applySavedTheme,
  };
}
