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
];

interface PersonalTheme {
  presetId: string | null;
  primary: string;
  accent: string;
  sidebar: string;
}

const STORAGE_KEY = 'serviceos-personal-theme';

function getStoredTheme(): PersonalTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hexToHsl(hex: string): string | null {
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
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hexToHslParts(hex: string): { h: number; s: number; l: number } | null {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;
  const parts = hsl.split(' ');
  return {
    h: parseInt(parts[0]),
    s: parseInt(parts[1]),
    l: parseInt(parts[2]),
  };
}

function applyThemeToDOM(theme: PersonalTheme) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');

  const primaryParts = hexToHslParts(theme.primary);
  const accentParts = hexToHslParts(theme.accent);

  if (primaryParts) {
    const { h, s } = primaryParts;
    const pl = isDark ? 55 : 38;

    // Core primary
    root.style.setProperty('--primary', `${h} ${s}% ${pl}%`);
    root.style.setProperty('--primary-foreground', `${h} ${Math.min(s, 30)}% 98%`);
    root.style.setProperty('--ring', `${h} ${s}% ${pl}%`);

    // Tint backgrounds/cards/borders with primary hue for cohesion
    if (isDark) {
      root.style.setProperty('--background', `${h} 40% 4%`);
      root.style.setProperty('--foreground', `${h} 20% 91%`);
      root.style.setProperty('--card', `${h} 30% 7%`);
      root.style.setProperty('--card-foreground', `${h} 20% 91%`);
      root.style.setProperty('--popover', `${h} 30% 7%`);
      root.style.setProperty('--popover-foreground', `${h} 20% 91%`);
      root.style.setProperty('--secondary', `${h} 25% 14%`);
      root.style.setProperty('--secondary-foreground', `${h} 20% 91%`);
      root.style.setProperty('--muted', `${h} 20% 11%`);
      root.style.setProperty('--muted-foreground', `${h} 10% 55%`);
      root.style.setProperty('--border', `${h} 25% 14%`);
      root.style.setProperty('--input', `${h} 25% 14%`);
    } else {
      root.style.setProperty('--background', `${h} 20% 98%`);
      root.style.setProperty('--foreground', `${h} 30% 11%`);
      root.style.setProperty('--card', `${h} 10% 100%`);
      root.style.setProperty('--card-foreground', `${h} 30% 11%`);
      root.style.setProperty('--popover', `${h} 10% 100%`);
      root.style.setProperty('--popover-foreground', `${h} 30% 11%`);
      root.style.setProperty('--secondary', `${h} 16% 93%`);
      root.style.setProperty('--secondary-foreground', `${h} 30% 20%`);
      root.style.setProperty('--muted', `${h} 15% 96%`);
      root.style.setProperty('--muted-foreground', `${h} 10% 46%`);
      root.style.setProperty('--border', `${h} 18% 90%`);
      root.style.setProperty('--input', `${h} 18% 90%`);
    }

    // Charts
    root.style.setProperty('--chart-1', `${h} ${s}% ${pl}%`);
    root.style.setProperty('--chart-2', `${h} ${Math.max(s - 20, 20)}% ${isDark ? 45 : 48}%`);
  }

  // Accent
  if (accentParts) {
    const { h, s } = accentParts;
    root.style.setProperty('--accent', `${h} ${Math.max(s - 50, 10)}% ${isDark ? 14 : 93}%`);
    root.style.setProperty('--accent-foreground', `${h} ${s}% ${isDark ? 91 : 11}%`);
    root.style.setProperty('--chart-3', `${h} ${s}% ${isDark ? 55 : 45}%`);
    root.style.setProperty('--chart-4', `${h} ${Math.max(s - 15, 20)}% ${isDark ? 40 : 55}%`);
  }

  // Sidebar
  const sidebarParts = hexToHslParts(theme.sidebar);
  if (sidebarParts && primaryParts) {
    const sh = sidebarParts.h;
    const ph = primaryParts.h;
    root.style.setProperty('--sidebar-background', `${sh} 47% ${sidebarParts.l}%`);
    root.style.setProperty('--sidebar-foreground', `${sh} 31% 91%`);
    root.style.setProperty('--sidebar-primary', `${ph} 94% 55%`);
    root.style.setProperty('--sidebar-primary-foreground', `0 0% 100%`);
    root.style.setProperty('--sidebar-accent', `${sh} 47% ${Math.min(sidebarParts.l + 5, 20)}%`);
    root.style.setProperty('--sidebar-accent-foreground', `${sh} 31% 91%`);
    root.style.setProperty('--sidebar-border', `${sh} 47% ${Math.min(sidebarParts.l + 7, 22)}%`);
    root.style.setProperty('--sidebar-ring', `${ph} 94% 55%`);
    root.style.setProperty('--sidebar-muted-foreground', `${sh} 11% 55%`);
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
    '--chart-1', '--chart-2', '--chart-3', '--chart-4',
    '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
    '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring', '--sidebar-muted-foreground',
  ];
  vars.forEach(v => root.style.removeProperty(v));
}

export function usePersonalTheme() {
  const [theme, setThemeState] = useState<PersonalTheme | null>(getStoredTheme);

  // Apply on mount and when theme changes
  useEffect(() => {
    if (theme) {
      applyThemeToDOM(theme);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } else {
      clearThemeFromDOM();
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [theme]);

  // Re-apply when dark mode toggles
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

  return {
    currentTheme: theme,
    currentPresetId: theme?.presetId || 'default',
    setTheme,
    setCustomColors,
    presets: THEME_PRESETS,
  };
}
