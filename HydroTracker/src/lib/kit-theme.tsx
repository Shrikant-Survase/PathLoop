import type { ReactNode } from 'react';

import { KitProvider } from '@/lib/kit';

/**
 * Your app's ExpoKit theme, written by `expo-kit init`. Wrap your root layout in it:
 *   <AppTheme><Stack /></AppTheme>
 * Already have a design system? Point the kit tokens at it in `colors`:
 * https://expokit.in/docs/design-tokens
 */
export function AppTheme({ children }: { children: ReactNode }) {
  return (
    <KitProvider
      scheme="system"
      colors={{
        // light: { background: tokens.surface, foreground: tokens.text, muted: tokens.subtle, border: tokens.line },
        light: {},
        dark: {},
      }}
    >
      {children}
    </KitProvider>
  );
}
