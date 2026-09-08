// Design tokens transcribed from the imported Claude Design system
// (`_design_import/Camera Confidence App.dc.html` + its Modernist design-system CSS).
// Mockups override the design system's 0px base radius with rounded 14-24px corners
// everywhere — this file encodes the mockup look, not the base token radius.

export const colors = {
  background: '#f3f2f2',
  surface: '#eae9e9',
  text: '#201e1d',
  white: '#ffffff',
  divider: 'rgba(32,30,29,0.16)',

  neutral: {
    100: '#f8f4f4',
    200: '#eae7e7',
    300: '#d7d3d3',
    400: '#bab6b6',
    500: '#9b9797',
    600: '#7d7979',
    700: '#605d5d',
    800: '#444141',
    900: '#2d2b2b',
  },

  accent: {
    100: '#fff2ef',
    200: '#ffe0d9',
    300: '#ffc4b8',
    400: '#ff9783',
    500: '#ff563c',
    600: '#dd2b0f',
    700: '#ae1800',
    800: '#7c1405',
    900: '#4d170e',
    DEFAULT: '#ec3013',
  },

  accent2: {
    100: '#fff2ef',
    200: '#ffe0da',
    300: '#ffc4b9',
    400: '#ff9784',
    500: '#ef6853',
    600: '#c94b39',
    700: '#9e3526',
    800: '#71261b',
    900: '#471d16',
    DEFAULT: '#e15b47',
  },

  // Premium tab deliberately breaks from the red accent system — gold gradient.
  gold: {
    light: '#e2b13c',
    dark: '#b8830a',
    button: '#c9930a',
  },

  success: '#1a8f4a',
  // Confirmed-state green, used by the `VerifiedCheck` badge on the
  // account-finishing screens. Deliberately outside the red accent ramp: a tick
  // drawn in `accent.DEFAULT` reads as an error/alert next to the same screen's
  // red primary button, where "verified" has to read as unambiguously good.
  successDark: '#14713b',
  successLight: '#e7f4ec',
  // In-progress state — a recorded day whose review isn't finished yet. Chosen
  // yellow-orange to sit clearly between `success` green and the red accent
  // without reading as either.
  pending: '#e08a1e',
  error: '#ae1800',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  fontFamily: {
    regular: 'Archivo_400Regular',
    semibold: 'Archivo_600SemiBold',
    extrabold: 'Archivo_800ExtraBold',
  },
  size: {
    xs: 11,
    sm: 12,
    body: 15,
    input: 16,
    button: 17,
    h4: 18,
    h3: 20,
    h2: 24,
    h1: 28,
  },
} as const;

export const shadows = {
  button: {
    shadowColor: colors.accent.DEFAULT,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  card: {
    shadowColor: colors.neutral[900],
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardLg: {
    shadowColor: colors.neutral[900],
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
} as const;

export const theme = { colors, spacing, radii, typography, shadows };
export type Theme = typeof theme;
