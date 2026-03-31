/**
 * Colores Geo-Goal para luz y modo oscuro
 * Mismo sistema de diseño que el frontend web
 */

import { Platform } from 'react-native';

const geoGreen = '#39FF14';
const geoBlack = '#0a0a0a';

export const Colors = {
  light: {
    text: '#0a0a0a',
    background: '#f0fdf4',
    tint: geoGreen,
    icon: geoGreen,
    tabIconDefault: geoGreen,
    tabIconSelected: geoGreen,
    card: '#ffffff',
    border: '#d1d5db',
  },
  dark: {
    text: '#fafafa',
    background: geoBlack,
    tint: geoGreen,
    icon: geoGreen,
    tabIconDefault: geoGreen,
    tabIconSelected: geoGreen,
    card: '#141414',
    border: '#262626',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
