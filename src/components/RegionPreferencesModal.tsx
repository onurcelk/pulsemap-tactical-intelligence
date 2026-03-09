import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Globe, Save } from 'lucide-react';
import { useAuth } from '../lib/auth';
import EmailPreviewModal from './EmailPreviewModal';

interface RegionPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  regions: { id: string; name: string }[];
}
const DEMO_COUNTRIES = [
  { id: 'turkey', label: 'Turkey' },
  { id: 'bahrain', label: 'Bahrain' },
  { id: 'israel', label: 'Israel' },
  { id: 'ukraine', label: 'Ukraine' },
  { id: 'russia', label: 'Russia' },
  { id: 'iran', label: 'Iran' },
  { id: 'usa', label: 'United States' },
  { id: 'china', label: 'China' },
];

export default function RegionPreferencesModal({
  isOpen,
  onClose,
  regions,
}: RegionPreferencesModalProps) {
  const { profile, updateProfile, loading } = useAuth();
  const [selectedRegions, setSelectedRegions] = React.useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [previewEmail, setPreviewEmail] = React.useState(false);

  React.useEffect(() => {
    if (profile?.preferences?.regions) {
      setSelectedRegions(profile.preferences.regions);
    }
    if (profile?.preferences?.countries) {
      setSelectedCountries(profile.preferences.countries);
    }
  }, [profile]);

  const toggleRegion = (id: string) => {
    setSelectedRegions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleCountry = (id: string) => {
    setSelectedCountries((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        preferences: {
          ...profile?.preferences,
          regions: selectedRegions,
          countries: selectedCountries,
        },
      });
      onClose();
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-[var(--bg)] border border-[var(--line)] rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-thin"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40" />

            <div className="flex justify-between items-center mb-6 sticky top-0 bg-[var(--bg)]/90 backdrop-blur-md z-10 py-2">
              <div className="flex items-center gap-3">
                <Globe className="text-[var(--accent)]" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tighter">Tactical Profile</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--line)] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4 block">
                  Intelligence Sectors (Macro)
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {regions.map((region) => {
                    const isSelected = selectedRegions.includes(region.id);
                    return (
                      <button
                        key={region.id}
                        onClick={() => toggleRegion(region.id)}
                        className={`
                                                    flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 group
                                                    ${
                                                      isSelected
                                                        ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40 text-[var(--accent)]'
                                                        : 'bg-[var(--line)]/30 border-transparent text-[var(--ink-dim)] hover:border-[var(--line)]'
                                                    }
                                                `}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider text-left">
                          {region.name}
                        </span>
                        <CheckCircle2
                          size={14}
                          className={`transition-all duration-500 flex-shrink-0 ml-2 ${isSelected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4 block">
                  Target Countries (Micro - Alerts)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {DEMO_COUNTRIES.map((country) => {
                    const isSelected = selectedCountries.includes(country.id);
                    return (
                      <button
                        key={country.id}
                        onClick={() => toggleCountry(country.id)}
                        className={`
                                                    py-2 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all text-left flex justify-between items-center
                                                    ${isSelected ? 'bg-[var(--info)]/20 border-[var(--info)]/40 text-[var(--info)] shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-[var(--line)]/10 border-transparent text-[var(--ink-dim)] hover:bg-[var(--line)]/30'}
                                                `}
                      >
                        {country.label}
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--info)] ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4 flex items-center justify-between">
                  <span>Transmission Protocols</span>
                  <button
                    onClick={() => setPreviewEmail(true)}
                    className="text-[var(--accent)] hover:text-white transition-colors underline decoration-[var(--accent)]/30 underline-offset-4"
                  >
                    Preview Alert Email
                  </button>
                </label>
                <div className="space-y-3">
                  {[
                    {
                      id: 'email',
                      name: 'Email Briefing',
                      desc: 'Alerts matching your Target Countries',
                    },
                    {
                      id: 'telegram',
                      name: 'Telegram Relay',
                      desc: 'Instant push alerts for high-priority events',
                    },
                  ].map((proto) => {
                    const isEnabled = !!profile?.preferences?.notifications?.[proto.id];
                    return (
                      <button
                        key={proto.id}
                        onClick={async () => {
                          const current = profile?.preferences?.notifications || {};
                          await updateProfile({
                            preferences: {
                              ...profile?.preferences,
                              notifications: { ...current, [proto.id]: !isEnabled },
                            },
                          });
                        }}
                        className="w-full flex items-center justify-between p-4 bg-[var(--line)]/10 border border-transparent hover:border-[var(--line)] rounded-2xl transition-all text-left"
                      >
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider">
                            {proto.name}
                          </div>
                          <div className="text-[9px] opacity-40 font-medium">{proto.desc}</div>
                        </div>
                        <div
                          className={`w-10 h-6 rounded-full relative transition-colors duration-300 ${isEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${isEnabled ? 'left-5' : 'left-1'}`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full bg-[var(--ink)] text-[var(--bg)] rounded-xl py-4 font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-8 shadow-xl"
            >
              <Save size={16} />
              {saving ? 'Synchronizing Archive...' : 'Verify & Lock Profile'}
            </button>
          </motion.div>
        </div>
      )}

      <EmailPreviewModal isOpen={previewEmail} onClose={() => setPreviewEmail(false)} />
    </AnimatePresence>
  );
}
