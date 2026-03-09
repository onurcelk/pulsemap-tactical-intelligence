import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, MapPin, Activity } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: any | null;
  onSaved: () => void;
}

export default function EventModal({ isOpen, onClose, eventToEdit, onSaved }: EventModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'military',
    lat: '',
    lng: '',
    location_name: '',
    region: 'middle-east',
    source_url: '',
    image_url: '',
    hot_score: '1',
    confidence_score: '50',
    status: 'published',
  });

  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        title: eventToEdit.title || '',
        description: eventToEdit.description || '',
        category: eventToEdit.category || 'military',
        lat: eventToEdit.lat?.toString() || '',
        lng: eventToEdit.lng?.toString() || '',
        location_name: eventToEdit.location_name || '',
        region: eventToEdit.region || 'middle-east',
        source_url: eventToEdit.source_url || '',
        image_url: eventToEdit.image_url || '',
        hot_score: eventToEdit.hot_score?.toString() || '1',
        confidence_score: eventToEdit.confidence_score?.toString() || '50',
        status: eventToEdit.status || 'published',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'military',
        lat: '',
        lng: '',
        location_name: '',
        region: 'middle-east',
        source_url: '',
        image_url: '',
        hot_score: '1',
        confidence_score: '50',
        status: 'published',
      });
    }
  }, [eventToEdit, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        location_name: formData.location_name,
        region: formData.region,
        source_url: formData.source_url,
        image_url: formData.image_url,
        hot_score: parseInt(formData.hot_score, 10),
        confidence_score: parseInt(formData.confidence_score, 10),
        status: formData.status,
      };

      if (eventToEdit) {
        // Update
        const { error: updateError } = await supabase
          .from('events')
          .update(payload)
          .eq('id', eventToEdit.id);

        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase.from('events').insert([payload]);

        if (insertError) throw insertError;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error saving event:', err);
      setError(err.message || 'Error occurred while saving data.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a1018] border border-[var(--line)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="p-6 border-b border-[var(--line)]">
          <h2 className="text-xl font-black uppercase tracking-wider text-white">
            {eventToEdit ? 'Edit Pin' : 'Add New Pin'}
          </h2>
          <p className="text-sm font-mono text-[var(--ink-dim)] mt-1">
            Manually manage intelligence events on the map
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg flex items-start gap-2 font-mono">
              <Activity size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Title
              </label>
              <input
                type="text"
                required
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/40 border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Description / Details
              </label>
              <textarea
                required
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 bg-black/40 border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#0a1018] border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              >
                <option value="military">Military</option>
                <option value="explosion">Explosion</option>
                <option value="protest">Protest</option>
                <option value="politics">Politics</option>
                <option value="humanitarian">Humanitarian</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#0a1018] border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              >
                <option value="published">Published</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Latitude (Lat)
              </label>
              <input
                type="number"
                step="any"
                required
                name="lat"
                value={formData.lat}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/40 border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Longitude (Lng)
              </label>
              <input
                type="number"
                step="any"
                required
                name="lng"
                value={formData.lng}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/40 border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Location Name (City/Country)
              </label>
              <input
                type="text"
                required
                name="location_name"
                value={formData.location_name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/40 border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Region
              </label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#0a1018] border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              >
                <option value="middle-east">Middle East</option>
                <option value="europe-ukr">Europe / UKR</option>
                <option value="asia">Asia / HK / TW</option>
                <option value="africa">Africa</option>
                <option value="global">Global</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Source URL
              </label>
              <input
                type="url"
                name="source_url"
                value={formData.source_url}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/40 border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Hot Score
              </label>
              <input
                type="number"
                min="1"
                max="100"
                required
                name="hot_score"
                value={formData.hot_score}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/40 border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-dim)] mb-2">
                Confidence Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                name="confidence_score"
                value={formData.confidence_score}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/40 border border-[var(--line)] rounded-xl text-white focus:border-[var(--accent)] focus:outline-none font-mono text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-[var(--line)] text-white hover:bg-white/5 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black uppercase tracking-wider shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Pin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
