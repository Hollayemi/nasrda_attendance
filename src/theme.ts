/** JS mirror of the Tailwind palette, for props that can't take className (icons, placeholders, etc.). */
export const colors = {
  navy: '#19297D', navyLight: '#2C3FA0', navyDark: '#101B57',
  green: '#0F8A5F', amber: '#D99A00', red: '#C0392B',
  bg: '#F3F6FA', card: '#FFFFFF', line: '#E3E9F0', input: '#CFD8E3',
  ink: '#14212E', muted: '#6B7A8C', placeholder: '#9AA7B6',
  white: '#FFFFFF',
} as const;

export const shadow = {
  shadowColor: '#0B2A4A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
} as const;
