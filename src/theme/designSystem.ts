/**
 * 33 Trends — Design System v2.0
 * "A quietly luxurious system for a personal stylist."
 * Warm heritage neutrals meet stark Swiss discipline.
 * Source: STYLED_Business_Strategy_v2.docx + 33 Trends-Design-System.html v2.0
 */

export const colors = {
  bone: '#FDFBFA',
  paper: '#F7F3ED',
  sand: '#F2EBE3',
  camel: '#B89664',
  tobacco: '#7A5C43',
  /**
   * The brand rust — sampled from the "33." logotype (33 logo_FINAL.png).
   * The action colour: primary buttons and anything that says "tap me".
   */
  rust: '#8F4D35',
  ink: '#1C1C1C',
  card: '#FFFFFF',
  hair: 'rgba(28, 28, 28, 0.08)',
  inkMuted: 'rgba(28, 28, 28, 0.65)',
  inkFaint: 'rgba(28, 28, 28, 0.4)',
  white: '#FFFFFF',
} as const;

export const fonts = {
  serif: 'PlayfairDisplay_400Regular',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
  serifMedium: 'PlayfairDisplay_500Medium',
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemiBold: 'InstrumentSans_600SemiBold',
} as const;

export const type = {
  display: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 42 },
  section: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 30 },
  h3: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 22 },
  pullQuote: { fontFamily: fonts.serifItalic, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: colors.tobacco,
  },
  microLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
} as const;

export const spacing = {
  micro: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  section: 32,
  page: 24,
} as const;

/**
 * Corner radii. The reference is the floating tab bar's capsule (`full`):
 * every box in the app rounds toward it — `md` for cards, option rows and
 * inputs, `sm` for thumbnails and small controls, `lg` for modals and large
 * feature cards, `full` for buttons, chips and pills. Sharp corners
 * (`none`) are reserved for full-bleed imagery and hairlines. Values match
 * the radii the majority of screens already used (8/12/16), so adopting
 * the token is a no-op where a screen was already right.
 */
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const shadow = {
  none: {},
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 3,
  },
} as const;

export const fontAssets = {
  PlayfairDisplay_400Regular: require('@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf'),
  PlayfairDisplay_400Regular_Italic: require('@expo-google-fonts/playfair-display/400Regular_Italic/PlayfairDisplay_400Regular_Italic.ttf'),
  PlayfairDisplay_500Medium: require('@expo-google-fonts/playfair-display/500Medium/PlayfairDisplay_500Medium.ttf'),
  InstrumentSans_400Regular: require('@expo-google-fonts/instrument-sans/400Regular/InstrumentSans_400Regular.ttf'),
  InstrumentSans_500Medium: require('@expo-google-fonts/instrument-sans/500Medium/InstrumentSans_500Medium.ttf'),
  InstrumentSans_600SemiBold: require('@expo-google-fonts/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf'),
};
