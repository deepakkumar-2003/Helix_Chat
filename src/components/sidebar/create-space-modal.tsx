'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/auth-provider';
import { X, Hash, Lock, Loader2 } from 'lucide-react';

interface CreateSpaceModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSpaceModal({ onClose, onCreated }: CreateSpaceModalProps) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Create space with owner using database function (handles both atomically)
      const { data: space, error: spaceError } = await supabase
        .rpc('create_space_with_owner', {
          p_name: name.trim(),
          p_description: description.trim() || null,
          p_is_private: isPrivate,
          p_user_id: profile.id,
        });

      if (spaceError) throw spaceError;

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create space');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[90vh] sm:max-h-none overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <h2 className="text-base sm:text-lg font-semibold text-white">Create a Space</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white active:text-white transition-colors touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Space name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Engineering Team"
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2.5 px-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space about?"
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2.5 px-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-base"
            />
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-lg border-2 transition-colors touch-manipulation ${
                !isPrivate
                  ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500 active:border-slate-400'
              }`}
            >
              <Hash className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">Public</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-lg border-2 transition-colors touch-manipulation ${
                isPrivate
                  ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500 active:border-slate-400'
              }`}
            >
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">Private</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            {isPrivate
              ? 'Only invited members can see and join this space.'
              : 'Anyone in the workspace can see and join this space.'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded-lg transition-colors touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 px-4 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Space'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
