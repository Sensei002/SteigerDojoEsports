import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { getSiteSettings, DEFAULT_SETTINGS } from '@/services/siteSettingsService';
import type { SiteSettings } from '@/types';

interface SettingsContextValue {
  settings: SiteSettings;
  /** Re-fetch from Firestore (call after saving in the admin dashboard). */
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

/**
 * Loads the editable site settings once and shares them app-wide. Initialises
 * to DEFAULT_SETTINGS so the UI renders instantly (never blank) and stays
 * correct even if Firestore is unreachable.
 */
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  const refreshSettings = useCallback(async () => {
    try {
      setSettings(await getSiteSettings());
    } catch (e) {
      // Keep the defaults on failure — the site must still render.
      console.error('Failed to load site settings:', e);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSiteSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSiteSettings must be used within a SettingsProvider');
  return ctx;
};
