// ═══════════════════════════════════════════════════════════
// BIU Smart App — theme/index.js
// Design System Tokens (Expo uchun moslashtirilgan)
// ═══════════════════════════════════════════════════════════
import { Platform } from 'react-native';

export const Colors = {
    primary:       '#1E2761',
    secondary:     '#028090',
    accent:        '#CADCFC',
    primaryDark:   '#141A4A',
  
    success:       '#10B981',
    warning:       '#F59E0B',
    danger:        '#EF4444',
    purple:        '#7C3AED',
  
    background:    '#F8FAFC',
    surface:       '#FFFFFF',
    border:        '#E2E8F0',
    borderLight:   '#F1F5F9',
  
    textPrimary:   '#1E293B',
    textSecondary: '#64748B',
    textMuted:     '#94A3B8',
    textDisabled:  '#CBD5E1',
    white:         '#FFFFFF',
    black:         '#000000',
  
    primaryTint:   '#EFF6FF',
    secondaryTint: '#F0FDFA',
    successTint:   '#F0FDF4',
    warningTint:   '#FFFBEB',
    dangerTint:    '#FEF2F2',
    purpleTint:    '#F5F3FF',
    amberTint:     '#FEF3C7',
  };
  
  export const Spacing = {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  };
  
  export const Radius = {
    xs:   4,
    sm:   8,
    md:   12,
    lg:   16,
    xl:   20,
    xxl:  28,
    full: 9999,
  };
  
  export const FontSize = {
    xs:      11,
    sm:      12,
    caption: 13,
    body:    15,
    h3:      18,
    h2:      22,
    h1:      28,
    display: 36,
    hero:    48,
  };
  
  export const FontWeight = {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    heavy:    '800',
  };
  
  export const Shadow = {
    xs: Platform.select({
      web: { boxShadow: '0px 1px 4px rgba(0,0,0,0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
    card: Platform.select({
      web: { boxShadow: '0px 2px 12px rgba(30,39,97,0.08)' },
      default: {
        shadowColor: '#1E2761',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
    modal: Platform.select({
      web: { boxShadow: '0px 8px 32px rgba(0,0,0,0.16)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 32,
        elevation: 16,
      },
    }),
    button: Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(2,128,144,0.28)' },
      default: {
        shadowColor: '#028090',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
    nav: Platform.select({
      web: { boxShadow: '0px -2px 12px rgba(0,0,0,0.06)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 12,
      },
    }),
  };
  
  export default { Colors, Spacing, Radius, FontSize, FontWeight, Shadow };