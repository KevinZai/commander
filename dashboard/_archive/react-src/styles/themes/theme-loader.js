/**
 * CC Commander — Dashboard Theme Loader
 * Switches between 4 skins: claude (default), oled, matrix, random
 * Persists choice in localStorage.
 */

const THEMES = ['claude', 'oled', 'matrix'];

const RANDOM_PALETTES = [
  {
    name: 'cyberpunk',
    vars: {
      '--bg-primary': '#0D0221', '--bg-secondary': '#1A0533', '--bg-card': '#1F0A3E',
      '--primary': '#FF6EC7', '--primary-bright': '#FF9ED8', '--accent': '#00D4FF',
      '--emerald': '#00FF88', '--text-white': '#FF6EC7', '--text-secondary': '#CC58A0',
      '--border-color': '#3D1A6E', '--heatmap-peak': '#FF6EC7',
    },
  },
  {
    name: 'sunset',
    vars: {
      '--bg-primary': '#1A0A2E', '--bg-secondary': '#2D1548', '--bg-card': '#3A1F5C',
      '--primary': '#FF6B35', '--primary-bright': '#FF8C5A', '--accent': '#7B2D8E',
      '--emerald': '#FFD700', '--text-white': '#FF6B35', '--text-secondary': '#CC5A2C',
      '--border-color': '#4A2870', '--heatmap-peak': '#FF6B35',
    },
  },
  {
    name: 'arctic',
    vars: {
      '--bg-primary': '#2E3440', '--bg-secondary': '#3B4252', '--bg-card': '#434C5E',
      '--primary': '#88C0D0', '--primary-bright': '#8FBCBB', '--accent': '#5E81AC',
      '--emerald': '#A3BE8C', '--text-white': '#ECEFF4', '--text-secondary': '#D8DEE9',
      '--border-color': '#4C566A', '--heatmap-peak': '#88C0D0',
    },
  },
  {
    name: 'coral',
    vars: {
      '--bg-primary': '#0A1628', '--bg-secondary': '#0F1F35', '--bg-card': '#142840',
      '--primary': '#FF7F50', '--primary-bright': '#FFA07A', '--accent': '#008080',
      '--emerald': '#20B2AA', '--text-white': '#FF7F50', '--text-secondary': '#CC6640',
      '--border-color': '#1A3350', '--heatmap-peak': '#FF7F50',
    },
  },
  {
    name: 'neon',
    vars: {
      '--bg-primary': '#0D0D0D', '--bg-secondary': '#1A1A1A', '--bg-card': '#222222',
      '--primary': '#ADFF2F', '--primary-bright': '#CCFF66', '--accent': '#FF1493',
      '--emerald': '#00FF7F', '--text-white': '#ADFF2F', '--text-secondary': '#8BCC26',
      '--border-color': '#333333', '--heatmap-peak': '#ADFF2F',
    },
  },
];

/**
 * Get the current theme name from localStorage or default.
 */
export function getCurrentTheme() {
  if (typeof window === 'undefined') return 'claude';
  return localStorage.getItem('cc-dashboard-theme') || 'claude';
}

/**
 * Apply a theme to the document root.
 */
export function applyTheme(themeName) {
  if (typeof document === 'undefined') return;

  if (themeName === 'random') {
    const palette = RANDOM_PALETTES[Math.floor(Math.random() * RANDOM_PALETTES.length)];
    document.documentElement.removeAttribute('data-theme');
    Object.entries(palette.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    localStorage.setItem('cc-dashboard-theme', 'random');
    localStorage.setItem('cc-dashboard-random-palette', palette.name);
    return palette.name;
  }

  // Clear any random palette inline styles
  RANDOM_PALETTES[0] && Object.keys(RANDOM_PALETTES[0].vars).forEach((key) => {
    document.documentElement.style.removeProperty(key);
  });

  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('cc-dashboard-theme', themeName);
  return themeName;
}

/**
 * Initialize theme on page load.
 */
export function initTheme() {
  const saved = getCurrentTheme();
  applyTheme(saved);
  return saved;
}

/**
 * Get list of all available themes.
 */
export function getThemeList() {
  return [
    { id: 'claude', name: 'Claude Anthropic', description: 'Professional warm amber on deep navy' },
    { id: 'oled', name: 'OLED Black', description: 'Pure black for OLED displays' },
    { id: 'matrix', name: 'Matrix', description: 'Classic green-on-black with CRT effects' },
    { id: 'random', name: 'Surprise Me', description: 'Random curated palette each time' },
  ];
}

export { THEMES, RANDOM_PALETTES };
