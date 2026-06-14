import { useEffect, useState } from 'react';
import { FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useSiteSettings } from '@/contexts/SettingsContext';
import { updateSiteSettings } from '@/services/siteSettingsService';
import { useToast } from '@/contexts/ToastContext';
import type { SiteSettings, SocialLinks, LegalLink } from '@/types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

/** Labelled card section to group related fields. */
const FieldGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="card-surface space-y-4 p-5">
    <h3 className="heading-display text-sm uppercase tracking-wide text-white">{title}</h3>
    {children}
  </div>
);

const SOCIAL_FIELDS: { key: keyof SocialLinks; label: string }[] = [
  { key: 'discord', label: 'Discord URL' },
  { key: 'twitter', label: 'Twitter URL' },
  { key: 'twitch', label: 'Twitch URL' },
  { key: 'youtube', label: 'YouTube URL' },
  { key: 'instagram', label: 'Instagram URL' },
];

/**
 * Editor for the site-wide content (brand, hero, footer, contact, socials).
 * Bound to the SettingsContext: saves to Firestore and refreshes the live site.
 */
const SiteSettingsTab = () => {
  const { settings, refreshSettings } = useSiteSettings();
  const { success, error } = useToast();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [busy, setBusy] = useState(false);

  // Keep the local form in sync if the context loads/refreshes after mount.
  useEffect(() => setForm(settings), [settings]);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setSocial = (key: keyof SocialLinks, value: string) =>
    setForm((f) => ({ ...f, socials: { ...f.socials, [key]: value } }));
  const setLegal = (i: number, patch: Partial<LegalLink>) =>
    setForm((f) => ({
      ...f,
      legalLinks: f.legalLinks.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));
  const addLegal = () =>
    setForm((f) => ({ ...f, legalLinks: [...f.legalLinks, { label: '', url: '' }] }));
  const removeLegal = (i: number) =>
    setForm((f) => ({ ...f, legalLinks: f.legalLinks.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.brandName.trim()) return error('Brand name is required.');
    setBusy(true);
    try {
      await updateSiteSettings({
        ...form,
        legalLinks: form.legalLinks.filter((l) => l.label.trim() && l.url.trim()),
      });
      await refreshSettings();
      success('Site settings saved.');
    } catch (e) {
      error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-gray">
          Edit your brand, home hero and footer. Changes apply across the whole site.
        </p>
        <Button leftIcon={<FiSave />} loading={busy} onClick={save}>Save changes</Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FieldGroup title="Brand">
          <Input label="Brand name" value={form.brandName} onChange={(e) => set('brandName', e.target.value)} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Wordmark — first part" value={form.logoPrimary} onChange={(e) => set('logoPrimary', e.target.value)} placeholder="Steiger" />
            <Input label="Wordmark — accented part" value={form.logoSecondary} onChange={(e) => set('logoSecondary', e.target.value)} placeholder="Dojo" />
          </div>
        </FieldGroup>

        <FieldGroup title="Contact">
          <Input label="Support email" type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="support@example.com" />
        </FieldGroup>

        <FieldGroup title="Home hero">
          <Input label="Headline" value={form.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} />
          <Textarea label="Sub-text" value={form.heroSubtitle} onChange={(e) => set('heroSubtitle', e.target.value)} />
        </FieldGroup>

        <FieldGroup title="Footer">
          <Textarea label="Tagline / about" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-brand-gray">Legal links</label>
            {form.legalLinks.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1"><Input value={l.label} onChange={(e) => setLegal(i, { label: e.target.value })} placeholder="Label" /></div>
                <div className="flex-[2]"><Input value={l.url} onChange={(e) => setLegal(i, { url: e.target.value })} placeholder="https://… or #" /></div>
                <button type="button" onClick={() => removeLegal(i)} className="text-brand-gray hover:text-brand-red"><FiTrash2 size={16} /></button>
              </div>
            ))}
            <Button size="sm" variant="ghost" leftIcon={<FiPlus />} onClick={addLegal}>Add link</Button>
          </div>
        </FieldGroup>

        <FieldGroup title="Social links">
          <p className="text-xs text-brand-gray">Leave a field empty to hide that icon in the footer.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((s) => (
              <Input key={s.key} label={s.label} value={form.socials[s.key] ?? ''} onChange={(e) => setSocial(s.key, e.target.value)} placeholder="https://…" />
            ))}
          </div>
        </FieldGroup>
      </div>

      <div className="flex justify-end">
        <Button leftIcon={<FiSave />} loading={busy} onClick={save}>Save changes</Button>
      </div>
    </div>
  );
};

export default SiteSettingsTab;
