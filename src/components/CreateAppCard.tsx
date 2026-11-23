import React, { useState, useEffect } from 'react';
import { GitBranch, Link as LinkIcon, Sparkles, Box, Check, ArrowRight, Loader2 } from 'lucide-react';
import { StarterKit } from '../types';

interface CreateAppCardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateApp: (name: string, starterKit: StarterKit) => Promise<void>;
  onOpenClone: () => void;
  onOpenLink: () => void;
  isCreating: boolean;
}

interface KitOption {
  id: StarterKit;
  title: string;
  tagline: string;
  iconBg: string;
  badge?: string;
}

const STARTER_KITS: KitOption[] = [
  {
    id: 'none',
    title: 'No Starter Kit',
    tagline: 'Standard clean Laravel installation',
    iconBg: 'from-red-500/20 to-red-600/30 text-red-400',
    badge: 'Classic',
  },
  {
    id: 'react',
    title: 'React',
    tagline: 'Breeze / Inertia.js with React & TypeScript',
    iconBg: 'from-cyan-500/20 to-cyan-600/30 text-cyan-400',
    badge: 'SPA / SSR',
  },
  {
    id: 'vue',
    title: 'Vue',
    tagline: 'Breeze / Inertia.js with Vue 3 & Composition API',
    iconBg: 'from-emerald-500/20 to-emerald-600/30 text-emerald-400',
    badge: 'Popular',
  },
  {
    id: 'svelte',
    title: 'Svelte',
    tagline: 'Breeze / Inertia.js with Svelte 5 reactive core',
    iconBg: 'from-orange-500/20 to-orange-600/30 text-orange-400',
    badge: 'Lightweight',
  },
  {
    id: 'livewire',
    title: 'Livewire',
    tagline: 'Full-stack Laravel with Livewire 3 & Alpine',
    iconBg: 'from-pink-500/20 to-pink-600/30 text-pink-400',
    badge: 'Dynamic',
  },
];

export const CreateAppCard: React.FC<CreateAppCardProps> = ({
  isOpen,
  onClose,
  onCreateApp,
  onOpenClone,
  onOpenLink,
  isCreating,
}) => {
  const [appName, setAppName] = useState('');
  const [selectedKit, setSelectedKit] = useState<StarterKit>('none');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAppName('');
      setSelectedKit('none');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sanitizedDomain = appName.trim()
    ? `${appName
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9.-]/g, '')
        .replace(/-+/g, '-')
        .replace(/\.+/g, '.')
        .replace(/^[-.]+|[-.]+$/g, '')
        .replace(/\.test$/, '')}.test`
    : 'your-app.test';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      setError('Please provide an application name');
      return;
    }
    setError(null);
    try {
      await onCreateApp(appName.trim(), selectedKit);
      setAppName('');
    } catch (err: any) {
      setError(err?.toString() || 'Failed to create application');
    }
  };

  return (
    <div className="mx-6 my-4 p-5 rounded-xl bg-[#1e1e24]/90 backdrop-blur-xl border border-white/[0.12] shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Subtle Glow Backdrop */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header & Quick Action Links */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Let's build something amazing</h2>
          </div>
        </div>

        {/* Quick Links: Clone Repository & Link Existing App */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onOpenClone}
            className="flex items-center space-x-1.5 text-xs text-white/70 hover:text-white px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition active:scale-95"
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span>Clone Repository</span>
          </button>

          <button
            type="button"
            onClick={onOpenLink}
            className="flex items-center space-x-1.5 text-xs text-white/70 hover:text-white px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition active:scale-95"
          >
            <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Link Existing App</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Input: Name your app */}
        <div>
          <label className="block text-xs font-medium text-white/75 mb-1.5">
            Name your app
          </label>
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                value={appName}
                onChange={(e) => {
                  setAppName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. portfolio, ecommerce, saas-hub"
                className="w-full bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#16161a] focus:ring-2 focus:ring-blue-500/60 border border-white/[0.1] rounded-lg px-3.5 py-2 text-sm text-white placeholder-white/30 outline-none transition font-sans"
              />
            </div>

            {/* Live Domain Preview */}
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white/60">
              <span className="text-white/35">Domain:</span>
              <span className="text-blue-400 font-semibold">{sanitizedDomain}</span>
            </div>
          </div>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>

        {/* Starter Kit Selector Cards (5-Grid) */}
        <div>
          <label className="block text-xs font-medium text-white/75 mb-2">
            Starter Kit Selector
          </label>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            {STARTER_KITS.map((kit) => {
              const isSelected = selectedKit === kit.id;
              return (
                <div
                  key={kit.id}
                  onClick={() => setSelectedKit(kit.id)}
                  className={`cursor-pointer group relative p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600/[0.12] border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${kit.iconBg}`}>
                      <Box className="w-4 h-4" />
                    </div>
                    {kit.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60 border border-white/[0.06]">
                        {kit.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-white tracking-tight">{kit.title}</h3>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>

                  <p className="mt-1 text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                    {kit.tagline}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
          <div className="flex items-center space-x-2 text-xs text-white/40">
            <span>Configures .env, local database, and HTTPS automatically</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCreating || !appName.trim()}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-500/25 transition active:scale-95"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Application...</span>
                </>
              ) : (
                <>
                  <span>Create App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
