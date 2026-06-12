/**
 * Image uploads via Cloudinary (unsigned preset) — a free, server-less
 * replacement for Firebase Storage. Works entirely from the browser, so it
 * fits a static GitHub Pages deployment with no backend.
 *
 * Setup (one time):
 *  1. Create a free account at https://cloudinary.com
 *  2. Dashboard → note your "Cloud name".
 *  3. Settings → Upload → Upload presets → "Add upload preset".
 *       • Signing Mode: **Unsigned**
 *       • (optional) set an "Folder" if you want everything namespaced.
 *     Save and copy the preset name.
 *  4. Put both values in your .env (see .env.example):
 *       VITE_CLOUDINARY_CLOUD_NAME=...
 *       VITE_CLOUDINARY_UPLOAD_PRESET=...
 *
 * The same VITE_* values must also be added as GitHub Actions secrets for the
 * deployed build (see README → Deploy).
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/** True once both Cloudinary env vars are present and not placeholders. */
export const isStorageConfigured =
  !!CLOUD_NAME &&
  !CLOUD_NAME.startsWith('your-') &&
  !!UPLOAD_PRESET &&
  !UPLOAD_PRESET.startsWith('your-');

/**
 * Upload a file to Cloudinary and return its public HTTPS URL.
 *
 * @param folder  Logical folder (avatars / teams / tournaments / news) used to
 *                organise assets in the Cloudinary media library.
 * @param file    The image file to upload.
 */
export const uploadImage = async (
  folder: string,
  file: File
): Promise<string> => {
  if (!isStorageConfigured) {
    throw new Error(
      'Image uploads are not configured. Set VITE_CLOUDINARY_CLOUD_NAME and ' +
        'VITE_CLOUDINARY_UPLOAD_PRESET in your environment.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Image upload failed (${res.status}). ${detail}`);
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
};

export const uploadAvatar = (uid: string, file: File) =>
  uploadImage(`avatars/${uid}`, file);

export const uploadTeamLogo = (teamId: string, file: File) =>
  uploadImage(`teams/${teamId}`, file);

export const uploadTournamentBanner = (file: File) =>
  uploadImage('tournaments', file);

export const uploadNewsCover = (file: File) =>
  uploadImage('news', file);

/**
 * No-op on the free, server-less setup.
 *
 * Deleting Cloudinary assets requires a signed request (API secret), which
 * cannot be exposed in a static front-end. Replaced images simply become
 * orphaned in the media library; the free tier's storage quota is generous
 * enough that this is harmless. Kept as an async no-op so existing call sites
 * (`await deleteImage(url)`) continue to work unchanged.
 */
export const deleteImage = async (_url: string): Promise<void> => {
  // Intentionally does nothing — see doc comment above.
};
