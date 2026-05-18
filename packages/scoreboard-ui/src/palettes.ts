/**
 * Locked visual palette for game day.
 *
 * Keep this map shape even with a single key so day-of theme swapping remains a
 * one-line change instead of a component refactor.
 */
export const PALETTES = {
  green: {
    name: 'Outfield Green',
    bg: '#1d4233',
    panel: '#234c3a',
    panelDeep: '#173527',
    line: '#0e2419',
    ink: '#f0e6c8',
    inkDim: '#c9b988',
    gold: '#d6a23a',
    goldDeep: '#8a6722',
    accent: '#c8102e',
    accentInk: '#f0e6c8',
    boxBg: '#0e2419',
    boxInk: '#f0e6c8',
  },
} as const;

export type PaletteKey = keyof typeof PALETTES;
export type Palette = (typeof PALETTES)[PaletteKey];
