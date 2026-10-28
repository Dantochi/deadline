// Metro loads @firebase/auth's React Native build (the "react-native" export condition), which has
// getReactNativePersistence; TypeScript picks the package's top-level browser types, which do not.
import type { Persistence } from '@firebase/auth';

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
