import { useState } from 'react';
import { Plus, Search, LogOut, Calendar, Trash2, Edit3, Copy, Library, Layout } from 'lucide-react';
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Welcome CTA Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-[#e2d6c9] p-6 md:p-8 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#dfa283]/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight text-[#3c2f2f]">Create Beautiful Labels in Minutes</h2>
            <p className="text-sm text-[#6d5c5a] leading-relaxed">
              Design professional templates compatible with standard Avery sheets. Save your layout parameters, upload background artwork, and export high-res PDFs.
            </p>
          </div>

          <button
            onClick={onNewDesign}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#dfa283] hover:bg-[#d48e6c] text-white font-bold text-sm tracking-wide shadow-md shadow-[#dfa283]/10 hover:shadow-[#dfa283]/20 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            NEW LABEL DESIGN
          </button>
        </div>

        {/* Dashboard Catalog Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#e2d6c9] pb-5">
          
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
              All Designs ({savedDesigns.length})
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
          <div className="bg-white border border-[#e2d6c9] text-center py-16 px-6 rounded-2xl flex flex-col items-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#faf6f2] border border-[#e2d6c9] flex items-center justify-center text-[#9e8b89] mb-4">
              <Library className="w-6 h-6 opacity-80" />
            </div>
            <h3 className="text-base font-bold text-[#3c2f2f] mb-1">No label designs found</h3>
            <p className="text-xs text-[#6d5c5a] max-w-sm">
              {searchQuery 
                ? "No saved designs match your query. Try clearing the filter or searching for another stock number." 
                : "Your design library is currently empty. Click 'New Label Design' above to start your first layout."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredDesigns.map(design => {
              const template = templates.find(t => t.id === design.templateId) || templates[0];
              const aspect = template.width / template.height;
              // Calculate thumbnail bounding dimensions in px
              const thumbW = aspect >= 1 ? 160 : 160 * aspect;
              const thumbH = aspect >= 1 ? 160 / aspect : 160;

              return (
                <div 
                  key={design.id} 
                  className="bg-white border border-[#e2d6c9] rounded-2xl overflow-hidden hover:border-[#dfa283]/60 hover:shadow-lg transition-all flex flex-col group shadow-sm"
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
                  </div>

                  {/* Card Content Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-[#3c2f2f] truncate group-hover:text-[#dfa283] transition-colors" title={design.name}>
                        {design.name}
                      </h4>
                      <p className="text-[10px] text-[#6d5c5a] font-medium mt-1 truncate" title={template.name}>
                        {template.name} • {template.shape.charAt(0).toUpperCase() + template.shape.slice(1)}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#f4ebe1] flex items-center justify-between text-[10px] text-[#9e8b89]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(design.updatedAt || design.createdAt)}
                      </span>
                    </div>

                    {/* Hover Actions Overlays */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => onLoadDesign(design)}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-[#dfa283] hover:bg-[#d48e6c] text-white text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => onDuplicateDesign(design)}
                        className="p-2 rounded-lg bg-[#faf6f2] border border-[#e2d6c9] hover:bg-[#f4ebe1] text-[#6d5c5a] hover:text-[#3c2f2f] transition-all cursor-pointer"
                        title="Duplicate Design"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          const confirmed = await showConfirm(
                            'Delete Design',
                            `Are you sure you want to delete "${design.name}"? This action cannot be undone.`
                          );
                          if (confirmed) {
                            onDeleteDesign(design.id);
                          }
                        }}
                        className="p-2 rounded-lg bg-[#faf6f2] border border-[#e2d6c9] hover:border-rose-200 hover:bg-rose-50 text-[#6d5c5a] hover:text-rose-600 transition-all cursor-pointer"
                        title="Delete Design"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
