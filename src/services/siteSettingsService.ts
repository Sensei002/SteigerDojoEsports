import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { deepStripUndefined } from '@/utils/helpers';
import { BRAND_NAME } from '@/utils/constants';
import type { SiteSettings } from '@/types';

/**
 * Site-wide editable content lives in ONE Firestore document: `settings/site`.
 * Reads are public; writes are staff-only (see firestore.rules). Everything is
 * deep-merged onto DEFAULT_SETTINGS so a missing doc or missing field never
 * leaves the UI blank — the site renders identically to the old hardcoded copy
 * until an organizer edits it.
 */

const SETTINGS = 'settings';
const SITE_DOC = 'site';

/** Defaults seeded from the values that were previously hardcoded in source. */
export const DEFAULT_SETTINGS: SiteSettings = {
  brandName: BRAND_NAME,
  logoPrimary: 'Steiger',
  logoSecondary: 'Dojo',
  tagline:
    'The competitive home for esports tournaments. Create, compete, and climb the ranks across your favorite titles.',
  contactEmail: 'support@steigerdojo.gg',
  socials: {
    discord: 'https://discord.gg',
    twitter: 'https://twitter.com',
    twitch: 'https://twitch.tv',
    youtube: 'https://youtube.com',
    instagram: 'https://instagram.com',
  },
  heroTitle: `Welcome to ${BRAND_NAME}`,
  heroSubtitle: 'Create and compete in esports tournaments across R6, Valorant, CS2 and more.',
  legalLinks: [
    { label: 'Privacy', url: '#' },
    { label: 'Terms', url: '#' },
    { label: 'Cookies', url: '#' },
  ],
};

/** Read the site settings, merged onto defaults (never returns partial data). */
export const getSiteSettings = async (): Promise<SiteSettings> => {
  const snap = await getDoc(doc(db, SETTINGS, SITE_DOC));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  const data = snap.data() as Partial<SiteSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    // socials is a nested object — merge so a partial save keeps the rest.
    socials: { ...DEFAULT_SETTINGS.socials, ...(data.socials ?? {}) },
    legalLinks: data.legalLinks ?? DEFAULT_SETTINGS.legalLinks,
  };
};

/**
 * Write (merge) the site settings. `deepStripUndefined` keeps Firestore from
 * rejecting any unset optional field (e.g. a cleared social URL).
 */
export const updateSiteSettings = (data: Partial<SiteSettings>): Promise<void> =>
  setDoc(
    doc(db, SETTINGS, SITE_DOC),
    { ...deepStripUndefined(data), updatedAt: serverTimestamp() },
    { merge: true }
  );
