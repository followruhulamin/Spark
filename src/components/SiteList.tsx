import React from 'react';
import { Star, Globe, Plus, Sparkles, FolderOpen } from 'lucide-react';
import { Site, SupportedIde } from '../types';
import { SiteRow } from './SiteRow';

interface SiteListProps {
  sites: Site[];
  searchQuery: string;
  defaultIde: SupportedIde;
  onOpenBrowser: (url: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleHttps: (id: string) => void;
  onOpenIde: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onSetPhpVersion: (id: string, version: string) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenCreate: () => void;
  onOpenLink: () => void;
}

export const SiteList: React.FC<SiteListProps> = ({
  sites,
  searchQuery,
  defaultIde,
  onOpenBrowser,
  onToggleFavorite,
  onToggleHttps,
  onOpenIde,
  onOpenTerminal,
  onSetPhpVersion,
  onUnlink,
  onDelete,
  onOpenCreate,
  onOpenLink,
}) => {
  const filteredSites = sites.filter((site) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      site.name.toLowerCase().includes(q) ||
      site.domain.toLowerCase().includes(q) ||
      site.path.toLowerCase().includes(q) ||
      site.framework.toLowerCase().includes(q)
    );
  });

  const favorites = filteredSites.filter((s) => s.favorite);
  const ungrouped = filteredSites.filter((s) => !s.favorite);

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-xl shadow-blue-500/10">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-white tracking-tight">No Local Sites Yet</h3>
        <p className="text-xs text-white/50 max-w-sm mt-1 mb-6 leading-relaxed">
          Create a fresh Laravel app with your favorite starter kit, or link any existing PHP project from your Mac.
        </p>
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenCreate}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New App</span>
          </button>
          <button
            onClick={onOpenLink}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] transition active:scale-95"
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Link Existing Directory</span>
          </button>
        </div>
      </div>
    );
  }

  if (filteredSites.length === 0) {
    return (
      <div className="py-16 text-center text-white/40 text-xs">
        No sites found matching "{searchQuery}".
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {/* Group: Favorites */}
      {favorites.length > 0 && (
        <div>
          <div className="sticky top-0 z-10 flex items-center space-x-1.5 px-4 py-1.5 bg-[#16161a]/95 backdrop-blur-md border-b border-white/[0.06] text-[11px] font-semibold text-white/60 tracking-wider uppercase">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Favorites ({favorites.length})</span>
          </div>
          <div>
            {favorites.map((site) => (
              <SiteRow
                key={site.id}
                site={site}
                defaultIde={defaultIde}
                onOpenBrowser={onOpenBrowser}
                onToggleFavorite={onToggleFavorite}
                onToggleHttps={onToggleHttps}
                onOpenIde={onOpenIde}
                onOpenTerminal={onOpenTerminal}
                onSetPhpVersion={onSetPhpVersion}
                onUnlink={onUnlink}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Group: Ungrouped / All Sites */}
      {ungrouped.length > 0 && (
        <div>
          <div className="sticky top-0 z-10 flex items-center space-x-1.5 px-4 py-1.5 bg-[#16161a]/95 backdrop-blur-md border-b border-white/[0.06] text-[11px] font-semibold text-white/60 tracking-wider uppercase">
            <Globe className="w-3 h-3 text-blue-400" />
            <span>{favorites.length > 0 ? 'Other Sites' : 'Sites'} ({ungrouped.length})</span>
          </div>
          <div>
            {ungrouped.map((site) => (
              <SiteRow
                key={site.id}
                site={site}
                defaultIde={defaultIde}
                onOpenBrowser={onOpenBrowser}
                onToggleFavorite={onToggleFavorite}
                onToggleHttps={onToggleHttps}
                onOpenIde={onOpenIde}
                onOpenTerminal={onOpenTerminal}
                onSetPhpVersion={onSetPhpVersion}
                onUnlink={onUnlink}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
