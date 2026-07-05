import { useState, useRef, useEffect } from 'react';
import { Plus, Search, LogOut, Calendar, Trash2, Edit3, Copy, Library, Layout, MoreVertical } from 'lucide-react';
import { SavedDesign, UserSession } from '../types';
import { templates } from '../templates';
import StudioCanvas from './StudioCanvas';

interface DashboardProps {
  session: UserSession;
  savedDesigns: SavedDesign[];
  onLogout: () => void;
  onNewDesign: () => void;
  onLoadDesign: (design: SavedDesign) => void;
  onDeleteDesign: (id: string) => void;
  onDuplicateDesign: (design: SavedDesign) => void;
  showConfirm: (title: string, message: string) => Promise<boolean>;
}

// ==================== CARD DROPDOWN MENU ====================
function CardMenu({
  design,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  design: SavedDesign;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/80 backdrop-blur-sm border border-[#e2d6c9] hover:bg-white hover:border-[#dfa283]/50 text-[#9e8b89] hover:text-[#3c2f2f] transition-all cursor-pointer shadow-sm"
        title="More options"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-36 bg-white border border-[#e2d6c9] rounded-xl shadow-xl z-50 overflow-hidden py-1">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-[#3c2f2f] hover:bg-[#faf6f2] cursor-pointer transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#dfa283]" />
            {design.isTemplateBase ? 'Edit Template' : 'Edit Label'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDuplicate(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-[#3c2f2f] hover:bg-[#faf6f2] cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-[#9e8b89]" />
            Duplicate
          </button>
          <div className="h-px bg-[#f4ebe1] my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({
  session,
  savedDesigns,
  onLogout,
  onNewDesign,
  onLoadDesign,
  onDeleteDesign,
  onDuplicateDesign,
  showConfirm
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'base' | 'project'>('all');

  const filteredDesigns = savedDesigns.filter(design => {
    const matchesSearch = design.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          design.templateId.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'base') return matchesSearch && design.isTemplateBase;
    if (filterType === 'project') return matchesSearch && !design.isTemplateBase;
    return matchesSearch;
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf7] flex flex-col font-sans text-[#3c2f2f]">
      
      {/* Top Sticky Navbar */}
      <header className="h-16 border-b border-[#e2d6c9] bg-white/75 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#dfa283] to-[#e5bda7] flex items-center justify-center shadow-md">
            <Layout className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-[#3c2f2f] uppercase">Avery Studio Pro</h1>
            <p className="text-[10px] text-[#9e8b89] font-mono">Cloud Synced Workspace</p>
          </div>
        </div>

        {/* Right Session Panel */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-[#6d5c5a]">{session.email}</p>
            <p className="text-[9px] text-[#dfa283] font-semibold">Logged In</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf6f2] hover:bg-[#f4ebe1] text-xs text-[#6d5c5a] hover:text-[#3c2f2f] border border-[#e2d6c9] transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6 pb-24">

        {/* Dashboard Catalog Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Tab Categories */}
          <div className="bg-white p-1 rounded-xl border border-[#e2d6c9] inline-flex w-full sm:w-auto shadow-sm">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                filterType === 'all' 
                  ? 'bg-[#dfa283] text-white shadow-sm' 
                  : 'text-[#6d5c5a] hover:text-[#3c2f2f]'
              }`}
            >
              All ({savedDesigns.length})
            </button>
            <button
              onClick={() => setFilterType('project')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                filterType === 'project' 
                  ? 'bg-[#dfa283] text-white shadow-sm' 
                  : 'text-[#6d5c5a] hover:text-[#3c2f2f]'
              }`}
            >
              Label Projects
            </button>
            <button
              onClick={() => setFilterType('base')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                filterType === 'base' 
                  ? 'bg-[#dfa283] text-white shadow-sm' 
                  : 'text-[#6d5c5a] hover:text-[#3c2f2f]'
              }`}
            >
              Template Bases
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#9e8b89]">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name or Avery code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#e2d6c9] rounded-xl pl-10 pr-4 py-2 text-xs text-[#3c2f2f] placeholder-[#9e8b89] focus:outline-none focus:ring-2 focus:ring-[#dfa283]/50 focus:border-[#dfa283] transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Library Grid Catalog */}
        {filteredDesigns.length === 0 ? (
          <div className="bg-white border border-[#e2d6c9] text-center py-20 px-6 rounded-2xl flex flex-col items-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#faf6f2] border border-[#e2d6c9] flex items-center justify-center text-[#9e8b89] mb-4">
              <Library className="w-6 h-6 opacity-80" />
            </div>
            <h3 className="text-base font-bold text-[#3c2f2f] mb-1">No label designs found</h3>
            <p className="text-xs text-[#6d5c5a] max-w-sm">
              {searchQuery 
                ? "No saved designs match your query. Try clearing the filter or searching for another stock number." 
                : "Your design library is empty. Click the + button to create your first label."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredDesigns.map(design => {
              const template = templates.find(t => t.id === design.templateId) || templates[0];
              const aspect = template.width / template.height;
              const thumbW = aspect >= 1 ? 160 : 160 * aspect;
              const thumbH = aspect >= 1 ? 160 / aspect : 160;

              return (
                <div 
                  key={design.id} 
                  className="bg-white border border-[#e2d6c9] rounded-2xl overflow-hidden hover:border-[#dfa283]/60 hover:shadow-lg transition-all flex flex-col group shadow-sm cursor-pointer"
                  onClick={() => onLoadDesign(design)}
                >
                  {/* Canvas Thumbnail Preview Container */}
                  <div className="h-48 bg-[#faf6f2] border-b border-[#e2d6c9] flex items-center justify-center p-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#e2d6c9_1px,transparent_1px)] [background-size:12px_12px] opacity-40" />
                    
                    {/* Render Studio Canvas */}
                    <div className="shadow-md transform group-hover:scale-105 transition-transform duration-300">
                      <StudioCanvas 
                        template={template} 
                        state={{
                          ...design.state,
                          templateId: design.templateId,
                          viewMode: 'single',
                          showSafetyZone: false
                        } as any}
                        customWidth={thumbW}
                        customHeight={thumbH}
                      />
                    </div>

                    {/* Badge */}
                    <div className="absolute top-3 left-3">
                      {design.isTemplateBase ? (
                        <span className="bg-[#dfa283]/15 text-[#dfa283] border border-[#dfa283]/30 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-lg uppercase shadow-sm">
                          Template Base
                        </span>
                      ) : (
                        <span className="bg-[#f4ebe1] text-[#6d5c5a] border border-[#e2d6c9] text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-lg uppercase shadow-sm">
                          Label Project
                        </span>
                      )}
                    </div>

                    {/* 3-dot menu top-right */}
                    <div className="absolute top-3 right-3">
                      <CardMenu
                        design={design}
                        onEdit={() => onLoadDesign(design)}
                        onDuplicate={() => onDuplicateDesign(design)}
                        onDelete={async () => {
                          const confirmed = await showConfirm(
                            'Delete Design',
                            `Are you sure you want to delete "${design.name}"? This action cannot be undone.`
                          );
                          if (confirmed) onDeleteDesign(design.id);
                        }}
                      />
                    </div>
                  </div>

                  {/* Card Content Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#3c2f2f] truncate group-hover:text-[#dfa283] transition-colors" title={design.name}>
                        {design.name}
                      </h4>
                      <p className="text-[10px] text-[#6d5c5a] font-medium mt-1 truncate" title={template.name}>
                        {template.name} • {template.shape.charAt(0).toUpperCase() + template.shape.slice(1)}
                      </p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-[#f4ebe1] flex items-center justify-between text-[10px] text-[#9e8b89]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(design.updatedAt || design.createdAt)}
                      </span>
                      <span className="text-[10px] text-[#dfa283] font-semibold">
                        {design.isTemplateBase ? 'Use Template →' : 'Open →'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button - New Label */}
      <button
        onClick={onNewDesign}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#dfa283] hover:bg-[#d48e6c] text-white shadow-xl shadow-[#dfa283]/30 hover:shadow-[#dfa283]/50 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
        title="New Label Design"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
        {/* Tooltip */}
        <span className="absolute right-16 bg-[#3c2f2f] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg">
          New Label
        </span>
      </button>
    </div>
  );
}
