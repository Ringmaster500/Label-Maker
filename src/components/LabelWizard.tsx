import { useState, useEffect, Fragment } from 'react';
import { 
  ArrowLeft, ArrowRight, Check, Upload, Trash2, Printer, 
  Save, Circle, Square, ToggleLeft, ToggleRight, Sparkles,
  Search, Copy
} from 'lucide-react';
import { LabelState, SavedDesign } from '../types';
import { templates } from '../templates';
import StudioCanvas from './StudioCanvas';
import { jsPDF } from 'jspdf';
import { drawLabel } from '../utils/canvasEngine';

interface LabelWizardProps {
  activeDesign: SavedDesign | null;
  onSave: (
    name: string, 
    isTemplateBase: boolean, 
    state: Omit<LabelState, 'viewMode' | 'showSafetyZone'>,
    saveAsNew?: boolean
  ) => Promise<void>;
  onBackToDashboard: () => void;
  token: string;
  showAlert: (title: string, message: string) => void;
}

// ==================== HSV COLOR UTILITIES ====================
const hexToHsv = (hex: string): { h: number; s: number; v: number } => {
  let cleaned = hex.replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  if (cleaned.length !== 6) return { h: 0, s: 0, v: 100 };
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  
  const s = max === 0 ? 0 : Math.round((d / max) * 100);
  const v = Math.round(max * 100);
  return { h, s, v };
};

const hsvToHex = (h: number, s: number, v: number): string => {
  const sRatio = s / 100;
  const vRatio = v / 100;
  const c = vRatio * sRatio;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vRatio - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
  
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// ==================== CUSTOM COLOR PICKER ====================
interface CustomColorPickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const PASTEL_PALETTE = [
  '#ffffff', '#000000', '#f5ebe0', '#e3d5ca',
  '#d5bdaf', '#fcd5ce', '#ffb5a7', '#fec89a',
  '#e2ece9', '#dfe7fd', '#c3d1c4', '#d7c9e3',
  '#4a3e3d', '#3c2f2f', '#1e293b', '#64748b',
];

const CustomColorPicker = ({ label, value, onChange }: CustomColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [hsv, setHsv] = useState(() => hexToHsv(value));

  useEffect(() => {
    setHexInput(value);
    setHsv(hexToHsv(value));
  }, [value]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setHexInput(newVal);
    if (/^#[0-9A-F]{6}$/i.test(newVal)) {
      onChange(newVal);
      setHsv(hexToHsv(newVal));
    }
  };

  const handleSelectColor = (color: string) => {
    onChange(color);
    setHexInput(color);
    setHsv(hexToHsv(color));
  };

  // SV container drag handler
  const handleSvStart = (clientX: number, clientY: number, rect: DOMRect) => {
    const update = (xVal: number, yVal: number) => {
      const x = Math.max(0, Math.min(rect.width, xVal - rect.left));
      const y = Math.max(0, Math.min(rect.height, yVal - rect.top));
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);
      setHsv(prev => {
        const next = { ...prev, s, v };
        const hex = hsvToHex(next.h, next.s, next.v);
        onChange(hex);
        setHexInput(hex);
        return next;
      });
    };
    update(clientX, clientY);

    const handleMouseMove = (ev: MouseEvent) => {
      update(ev.clientX, ev.clientY);
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSvTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const update = (touchX: number, touchY: number) => {
      const x = Math.max(0, Math.min(rect.width, touchX - rect.left));
      const y = Math.max(0, Math.min(rect.height, touchY - rect.top));
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);
      setHsv(prev => {
        const next = { ...prev, s, v };
        const hex = hsvToHex(next.h, next.s, next.v);
        onChange(hex);
        setHexInput(hex);
        return next;
      });
    };
    const touch = e.touches[0];
    update(touch.clientX, touch.clientY);

    const handleTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length === 0) return;
      update(ev.touches[0].clientX, ev.touches[0].clientY);
    };
    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Hue track drag handler
  const handleHueStart = (clientX: number, rect: DOMRect) => {
    const update = (xVal: number) => {
      const x = Math.max(0, Math.min(rect.width, xVal - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;
      setHsv(prev => {
        const next = { ...prev, h };
        const hex = hsvToHex(next.h, next.s, next.v);
        onChange(hex);
        setHexInput(hex);
        return next;
      });
    };
    update(clientX);

    const handleMouseMove = (ev: MouseEvent) => {
      update(ev.clientX);
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleHueTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const update = (touchX: number) => {
      const x = Math.max(0, Math.min(rect.width, touchX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;
      setHsv(prev => {
        const next = { ...prev, h };
        const hex = hsvToHex(next.h, next.s, next.v);
        onChange(hex);
        setHexInput(hex);
        return next;
      });
    };
    const touch = e.touches[0];
    update(touch.clientX);

    const handleTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length === 0) return;
      update(ev.touches[0].clientX);
    };
    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="relative space-y-1">
      <label className="block text-[10px] font-semibold text-[#6d5c5a]">{label}</label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-lg border border-[#e2d6c9] shadow-sm cursor-pointer relative overflow-hidden transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: value }}
          title="Choose Color"
        />
        <input
          type="text"
          value={hexInput.toUpperCase()}
          onChange={handleHexChange}
          className="bg-white border border-[#e2d6c9] rounded-lg px-2.5 py-1.5 text-xs text-[#3c2f2f] font-mono w-24 focus:outline-none focus:ring-1 focus:ring-[#dfa283]"
          placeholder="#FFFFFF"
        />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 p-3.5 bg-white border border-[#e2d6c9] rounded-xl shadow-xl z-50 w-[210px] space-y-3 select-none">
            
            {/* SV Square Picker */}
            <div 
              onMouseDown={(e) => handleSvStart(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())}
              onTouchStart={handleSvTouchStart}
              style={{ backgroundColor: hsvToHex(hsv.h, 100, 100) }}
              className="relative w-full h-28 rounded-lg cursor-crosshair overflow-hidden select-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
              <div 
                className="absolute w-3.5 h-3.5 border-2 border-white rounded-full shadow -translate-x-1.5 -translate-y-1.5 pointer-events-none"
                style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
              />
            </div>

            {/* Hue Slider */}
            <div
              onMouseDown={(e) => handleHueStart(e.clientX, e.currentTarget.getBoundingClientRect())}
              onTouchStart={handleHueTouchStart}
              className="relative w-full h-3 rounded-full cursor-pointer select-none"
              style={{
                background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
              }}
            >
              <div
                className="absolute w-4.5 h-4.5 bg-white border border-[#e2d6c9] rounded-full shadow -translate-x-2 -translate-y-0.5 pointer-events-none"
                style={{ left: `${(hsv.h / 360) * 100}%` }}
              />
            </div>

            {/* Presets Grid */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[9px] font-bold text-[#9e8b89] uppercase tracking-wider block">Palette Presets</span>
              <div className="grid grid-cols-8 gap-1.5">
                {PASTEL_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleSelectColor(color)}
                    className={`w-4 h-4 rounded border cursor-pointer hover:scale-110 active:scale-90 transition-all ${
                      value.toLowerCase() === color.toLowerCase() ? 'border-[#dfa283] ring-1 ring-[#dfa283]' : 'border-[#e2d6c9]'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#f4ebe1] flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#6d5c5a] font-medium">Hex Color:</span>
              <input
                type="text"
                value={hexInput.toUpperCase()}
                onChange={handleHexChange}
                className="bg-[#faf6f2] border border-[#e2d6c9] rounded px-1.5 py-1 text-[10px] text-[#4a3e3d] font-mono w-20 text-center focus:outline-none focus:ring-1 focus:ring-[#dfa283]"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ==================== CUSTOM SLIDER WITH SNAPPING ====================
interface CustomSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  snapValue?: number;
  snapThreshold?: number;
  onChange: (val: number) => void;
}

const CustomSlider = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  snapValue,
  snapThreshold = 3,
  onChange
}: CustomSliderProps) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = parseFloat(e.target.value);
    if (snapValue !== undefined && Math.abs(rawVal - snapValue) <= snapThreshold) {
      onChange(snapValue);
    } else {
      onChange(rawVal);
    }
  };

  const handleNudge = (direction: 'prev' | 'next') => {
    let newVal = direction === 'prev' ? value - step : value + step;
    newVal = Math.max(min, Math.min(max, newVal));
    onChange(Number(newVal.toFixed(2)));
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] font-semibold text-[#6d5c5a]">
        <span>{label}</span>
        <span className="font-mono bg-[#f4ebe1] px-1.5 py-0.5 rounded text-[#4a3e3d]">
          {value}{unit}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleNudge('prev')}
          className="w-6 h-6 rounded-lg bg-white border border-[#e2d6c9] hover:bg-[#faf6f2] flex items-center justify-center text-xs font-bold text-[#4a3e3d] shadow-sm select-none cursor-pointer"
        >
          -
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className="custom-slider flex-1 cursor-pointer"
        />
        <button
          type="button"
          onClick={() => handleNudge('next')}
          className="w-6 h-6 rounded-lg bg-white border border-[#e2d6c9] hover:bg-[#faf6f2] flex items-center justify-center text-xs font-bold text-[#4a3e3d] shadow-sm select-none cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
};

// ==================== SEARCHABLE FONT SELECTOR ====================
interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const BUILTIN_FONTS = [
  'Inter',
  'Playfair Display',
  'Great Vibes',
  'Cinzel',
  'Alexandria'
];

const FontSelector = ({ label, value, onChange }: FontSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [fontsList, setFontsList] = useState<string[]>(BUILTIN_FONTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && fontsList.length === BUILTIN_FONTS.length) {
      setLoading(true);
      fetch('https://cdn.jsdelivr.net/gh/hasinhayder/google-fonts/fonts.json')
        .then(res => res.json() as Promise<{ fonts: string[] }>)
        .then(data => {
          if (data && data.fonts) {
            const combined = Array.from(new Set([...BUILTIN_FONTS, ...data.fonts]));
            setFontsList(combined);
          }
        })
        .catch(err => {
          console.error('Failed to load Google Fonts:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  const filteredFonts = fontsList.filter(f =>
    f.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50);

  useEffect(() => {
    if (value) {
      loadGoogleFont(value);
    }
    filteredFonts.forEach(font => {
      loadGoogleFont(font);
    });
  }, [value, search, fontsList, isOpen]);

  const loadGoogleFont = (fontName: string) => {
    if (BUILTIN_FONTS.includes(fontName)) return;
    const id = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  };

  return (
    <div className="relative space-y-1">
      <label className="block text-[10px] font-semibold text-[#6d5c5a]">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#e2d6c9] rounded-lg px-3 py-1.5 text-xs text-[#4a3e3d] text-left flex justify-between items-center cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-[#dfa283]"
        style={{ fontFamily: value }}
      >
        <span>{value}</span>
        <span className="text-[9px] text-[#9e8b89]">▼</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1 bg-white border border-[#e2d6c9] rounded-xl shadow-xl z-50 p-2.5 max-h-64 flex flex-col space-y-2 w-[280px] sm:w-full">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#9e8b89]" />
              <input
                type="text"
                placeholder="Search 1,000+ fonts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#4a3e3d] focus:outline-none focus:ring-1 focus:ring-[#dfa283]"
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5">
              {loading && (
                <div className="text-[10px] text-[#9e8b89] text-center py-4">
                  Fetching Google Fonts catalog...
                </div>
              )}
              {!loading && filteredFonts.length === 0 && (
                <div className="text-[10px] text-[#9e8b89] text-center py-4">
                  No matching fonts found.
                </div>
              )}
              {!loading && filteredFonts.map(font => (
                <button
                  key={font}
                  type="button"
                  onClick={() => {
                    onChange(font);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    value === font ? 'bg-[#f4ebe1] text-[#3c2f2f]' : 'hover:bg-[#faf6f2] text-[#4a3e3d]'
                  }`}
                  style={{ fontFamily: font }}
                >
                  <span>{font}</span>
                  <span className="text-[10px] text-[#9e8b89]" style={{ fontFamily: 'initial' }}>Preview</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ==================== PRESET IMPORT/EXPORT SHARE PANEL ====================
const PresetSharePanel = ({ 
  editorState, 
  setEditorState,
  showAlert
}: { 
  editorState: LabelState, 
  setEditorState: React.Dispatch<React.SetStateAction<LabelState>>,
  showAlert: (title: string, message: string) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    const preset = {
      titleEnabled: editorState.titleEnabled,
      titleText: editorState.titleText,
      titleFont: editorState.titleFont,
      titleSize: editorState.titleSize,
      titleColor: editorState.titleColor,
      titleX: editorState.titleX,
      titleY: editorState.titleY,
      titleFontWeight: editorState.titleFontWeight,
      subtitleEnabled: editorState.subtitleEnabled,
      subtitleText: editorState.subtitleText,
      subtitleFont: editorState.subtitleFont,
      subtitleSize: editorState.subtitleSize,
      subtitleColor: editorState.subtitleColor,
      subtitleX: editorState.subtitleX,
      subtitleY: editorState.subtitleY,
      ingredientsEnabled: editorState.ingredientsEnabled,
      ingredientsText: editorState.ingredientsText,
      ingredientsFont: editorState.ingredientsFont,
      ingredientsSize: editorState.ingredientsSize,
      ingredientsColor: editorState.ingredientsColor,
      ingredientsX: editorState.ingredientsX,
      ingredientsY: editorState.ingredientsY,
      ingredientsAlign: editorState.ingredientsAlign,
      ingredientsWrap: editorState.ingredientsWrap,
      ingredientsLineHeight: editorState.ingredientsLineHeight,
      bgColor: editorState.bgColor
    };
    const json = JSON.stringify(preset);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    try {
      const parsed = JSON.parse(importText);
      setEditorState(prev => ({
        ...prev,
        ...parsed
      }));
      showAlert('Preset Imported', 'Preset imported successfully!');
      setImportText('');
      setIsOpen(false);
    } catch (e) {
      showAlert('Import Failed', 'Invalid preset code. Please check and try again.');
    }
  };

  return (
    <div className="space-y-3 bg-white border border-[#e2d6c9] p-4 rounded-xl shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs font-bold text-[#6d5c5a] cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <Copy className="w-4 h-4 text-[#dfa283]" /> Share & Import Preset
        </span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="space-y-3.5 pt-3 border-t border-[#f4ebe1]">
          <p className="text-[10px] text-[#6d5c5a] leading-relaxed">
            Copy your current design text, fonts, colors, and positioning layouts as a compact code snippet, or paste one from another label design.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex-1 py-2 px-3 rounded-lg bg-[#faf6f2] hover:bg-[#f4ebe1] text-[#3c2f2f] border border-[#e2d6c9] text-[11px] font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy Preset Code'}
            </button>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-[#6d5c5a] uppercase">Paste Preset Code</label>
            <textarea
              placeholder='{"titleEnabled":true,...}'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-lg px-2.5 py-1.5 text-[10px] text-[#3c2f2f] font-mono h-14 resize-none focus:outline-none focus:ring-1 focus:ring-[#dfa283]"
            />
            <button
              type="button"
              onClick={handleImport}
              className="w-full py-2 bg-[#dfa283] hover:bg-[#d48e6c] text-white rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              Apply Preset Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== IMAGE GALLERY MODAL ====================
interface GalleryImage {
  key: string;
  url: string;
  name: string;
  uploadedAt: string | null;
  size: number;
}

interface ImageGalleryProps {
  token: string;
  onSelect: (url: string) => void;
  onClose: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}

const ImageGallery = ({ token, onSelect, onClose, onUpload, uploading }: ImageGalleryProps) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/assets?list=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load gallery.');
        const data = await res.json() as GalleryImage[];
        setImages(data);
      } catch (err: any) {
        setError(err.message || 'Could not load your gallery.');
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, [token]);

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#3c2f2f]/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-[#e2d6c9] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2d6c9] shrink-0 bg-[#faf6f2]">
          <div>
            <h3 className="text-sm font-bold text-[#3c2f2f]">Image Gallery</h3>
            <p className="text-[10px] text-[#9e8b89]">
              {images.length > 0 ? `${images.length} image${images.length === 1 ? '' : 's'} in your library` : 'Your uploaded images'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Upload new inside gallery */}
            <label className="relative cursor-pointer px-3 py-1.5 bg-[#dfa283] hover:bg-[#d48e6c] text-white rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : 'Upload New'}
              <input type="file" accept="image/*" onChange={(e) => { onUpload(e); }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" disabled={uploading} />
            </label>
            <button onClick={onClose} className="p-2 rounded-xl bg-white border border-[#e2d6c9] text-[#6d5c5a] hover:text-[#3c2f2f] hover:bg-[#faf6f2] transition-all cursor-pointer shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#9e8b89]">
              <svg className="animate-spin h-7 w-7 text-[#dfa283]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs font-medium">Loading your gallery…</p>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#9e8b89]">
              <p className="text-xs font-semibold text-rose-500">{error}</p>
              <p className="text-[11px]">Try refreshing or uploading a new image.</p>
            </div>
          )}
          {!loading && !error && images.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#9e8b89]">
              <div className="p-4 rounded-2xl bg-[#faf6f2] border border-[#e2d6c9]">
                <Upload className="w-8 h-8 text-[#dfa283]" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-[#3c2f2f]">No images yet</p>
                <p className="text-[11px] text-[#9e8b89]">Upload your first image using the button above.</p>
              </div>
            </div>
          )}
          {!loading && !error && images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map(img => (
                <button
                  key={img.key}
                  type="button"
                  onClick={() => { onSelect(img.url); onClose(); }}
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 border-[#e2d6c9] hover:border-[#dfa283] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#dfa283] cursor-pointer bg-[#faf6f2]"
                  title={img.name}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Hover overlay with filename */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3c2f2f]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-[9px] text-white font-semibold leading-tight truncate w-full">{img.name}</p>
                  </div>
                  {/* Select checkmark on hover */}
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#dfa283] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    <Check className="w-3 h-3 stroke-[3px]" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PRESETS = [

  {
    id: 'elegant',
    name: 'Elegant Serif',
    config: {
      titleFont: 'Playfair Display',
      titleSize: 22,
      titleColor: '#334155',
      titleFontWeight: 'bold' as const,
      titleY: 28,
      subtitleFont: 'Inter',
      subtitleSize: 9,
      subtitleColor: '#64748b',
      subtitleY: 46,
      ingredientsFont: 'Inter',
      ingredientsSize: 6,
      ingredientsColor: '#64748b',
      ingredientsY: 72,
      ingredientsAlign: 'center' as const
    }
  },
  {
    id: 'minimalist',
    name: 'Minimalist Clean',
    config: {
      titleFont: 'Inter',
      titleSize: 18,
      titleColor: '#0f172a',
      titleFontWeight: 'bold' as const,
      titleY: 30,
      subtitleFont: 'Inter',
      subtitleSize: 8,
      subtitleColor: '#475569',
      subtitleY: 44,
      ingredientsFont: 'Inter',
      ingredientsSize: 5.5,
      ingredientsColor: '#64748b',
      ingredientsY: 75,
      ingredientsAlign: 'center' as const
    }
  },
  {
    id: 'classic',
    name: 'Classic Cinzel',
    config: {
      titleFont: 'Cinzel',
      titleSize: 18,
      titleColor: '#1e293b',
      titleFontWeight: 'bold' as const,
      titleY: 32,
      subtitleFont: 'Alexandria',
      subtitleSize: 8,
      subtitleColor: '#475569',
      subtitleY: 48,
      ingredientsFont: 'Alexandria',
      ingredientsSize: 5.5,
      ingredientsColor: '#64748b',
      ingredientsY: 74,
      ingredientsAlign: 'center' as const
    }
  },
  {
    id: 'cursive',
    name: 'Herbal Cursive',
    config: {
      titleFont: 'Great Vibes',
      titleSize: 32,
      titleColor: '#2d3748',
      titleFontWeight: 'normal' as const,
      titleY: 32,
      subtitleFont: 'Inter',
      subtitleSize: 9,
      subtitleColor: '#4a5568',
      subtitleY: 52,
      ingredientsFont: 'Inter',
      ingredientsSize: 6,
      ingredientsColor: '#718096',
      ingredientsY: 76,
      ingredientsAlign: 'center' as const
    }
  }
];

const DEFAULT_STATE: LabelState = {
  templateId: '22807',
  bgColor: '#ffffff',
  bgImageDataURL: null,
  bgScale: 100,
  bgX: 50,
  bgY: 50,
  titleEnabled: true,
  titleText: "Ema's Care",
  titleFont: 'Cinzel',
  titleSize: 8,
  titleColor: '#000000',
  titleX: 50,
  titleY: 47,
  titleFontWeight: 'bold',
  subtitleEnabled: true,
  subtitleText: 'Whipped Tallow',
  subtitleFont: 'Cinzel',
  subtitleSize: 9,
  subtitleColor: '#000000',
  subtitleX: 50,
  subtitleY: 54,
  ingredientsEnabled: true,
  ingredientsText: 'Ingredients: Beef Tallow',
  ingredientsFont: 'Alexandria',
  ingredientsSize: 6,
  ingredientsColor: '#000000',
  ingredientsX: 50,
  ingredientsY: 61,
  ingredientsAlign: 'center',
  ingredientsWrap: true,
  ingredientsLineHeight: 1.3,
  showSafetyZone: true,
  isTemplateBaseMode: false,
  activeBaseName: '',
  viewMode: 'single'
};

export default function LabelWizard({
  activeDesign,
  onSave,
  onBackToDashboard,
  token,
  showAlert
}: LabelWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [isTemplateBase, setIsTemplateBase] = useState(false);
  const [editorState, setEditorState] = useState<LabelState>(DEFAULT_STATE);
  
  // Tracks if we opened from a Template Base ("use template" flow)
  const [openedFromTemplateBase, setOpenedFromTemplateBase] = useState(false);

  // Filtering templates state
  const [searchQuery, setSearchQuery] = useState('');
  const [shapeFilter, setShapeFilter] = useState<'all' | 'circular' | 'square' | 'rectangular' | 'oval'>('all');

  // Design panel active sub-tab (mobile)
  const [designTab, setDesignTab] = useState<'background' | 'text'>('background');

  // Aesthetic presets collapsed state
  const [presetsOpen, setPresetsOpen] = useState(false);
  
  // Loading indicators
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Gallery modal
  const [showGallery, setShowGallery] = useState(false);

  // Load existing design on edit
  useEffect(() => {
    if (activeDesign) {
      setName(activeDesign.name);
      // When opening a Template Base, we're using it (not editing it),
      // so we start fresh (clear the name) and enter full edit mode
      const fromBase = activeDesign.isTemplateBase;
      setOpenedFromTemplateBase(fromBase);
      setIsTemplateBase(false); // default: save result as a label project
      setEditorState({
        ...DEFAULT_STATE,
        ...activeDesign.state,
        templateId: activeDesign.templateId,
        // Never lock in template-base-mode when opened from the dashboard
        isTemplateBaseMode: false,
      });
      if (fromBase) {
        // Clear name so user picks a new one for their label
        setName('');
      }
      // Start directly on Step 2 (Design) when editing
      setStep(2);
    } else {
      setName('');
      setIsTemplateBase(false);
      setOpenedFromTemplateBase(false);
      setEditorState(DEFAULT_STATE);
      setStep(1);
    }
  }, [activeDesign]);

  const selectedTemplate = templates.find(t => t.id === editorState.templateId) || templates[0];

  // Auto transition on Step 1 template click
  const handleSelectTemplate = (templateId: string) => {
    setEditorState(prev => ({ ...prev, templateId }));
    setStep(2);
  };

  const handleStateChange = <K extends keyof LabelState>(key: K, value: LabelState[K]) => {
    setEditorState(prev => ({ ...prev, [key]: value }));
  };

  // Image Upload handler R2
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) {
      showAlert('Invalid File Type', 'Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json() as { error?: string; url?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload artwork.');
      }

      if (data.url) {
        handleStateChange('bgImageDataURL', data.url);
        handleStateChange('bgScale', 100);
        handleStateChange('bgX', 50);
        handleStateChange('bgY', 50);
      }
    } catch (err: any) {
      showAlert('Upload Error', err.message || 'An error occurred during file upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    handleStateChange('bgImageDataURL', null);
  };

  // Preset Layout engine
  const applyPreset = (presetConfig: typeof PRESETS[0]['config']) => {
    setEditorState(prev => ({
      ...prev,
      ...presetConfig
    }));
  };

  // Save to DB
  const handleSaveToLibrary = async () => {
    if (!name.trim()) {
      showAlert('Name Required', 'Please enter a design name.');
      return;
    }

    setSaving(true);
    try {
      // Stripping temporary visualization settings from persistent state
      const { viewMode, showSafetyZone, ...persistentState } = editorState;
      // When opened from a template base: always save as a NEW label project (not overwrite template)
      const saveAsNew = openedFromTemplateBase ? true : false;
      const saveAsTemplateBase = openedFromTemplateBase ? false : isTemplateBase;
      await onSave(name, saveAsTemplateBase, persistentState, saveAsNew);
      showAlert('Design Saved', 'Design successfully synced to your cloud account!');
    } catch (err: any) {
      showAlert('Save Error', 'Failed to save layout: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // PDF Engine utilizing jsPDF
  const handleExportPDF = async () => {
    setExporting(true);

    // Give visual spinner a moment to draw
    await new Promise(resolve => setTimeout(resolve, 80));

    try {
      const template = selectedTemplate;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter' // 8.5" x 11"
      });

      // Render high resolution (300 DPI) temporary canvas
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = template.width * 300;
      tempCanvas.height = template.height * 300;

      // Preload image before generating PDF to guarantee it renders
      let bgImg: HTMLImageElement | null = null;
      if (editorState.bgImageDataURL) {
        bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          bgImg!.onload = resolve;
          bgImg!.onerror = () => {
            console.error('Failed to load image for print: ' + editorState.bgImageDataURL);
            resolve(null);
          };
          bgImg!.src = editorState.bgImageDataURL!;
        });
      }

      // Draw label (forPrint removes visual markers)
      drawLabel(tempCtx, template, { ...editorState, showSafetyZone: false }, bgImg, true);

      // Compress to PNG Base64 Stream
      const imgData = tempCanvas.toDataURL('image/png');

      const { leftMargin, topMargin, pitchX, pitchY, width, height } = template;
      const bleed = (template.id === '5165' || template.id === '8165') ? 0.0 : 0.04;

      // Render Grid loop stamp
      for (let r = 0; r < template.rows; r++) {
        for (let c = 0; c < template.cols; c++) {
          const x = (leftMargin + c * pitchX) - bleed;
          const y = (topMargin + r * pitchY) - bleed;
          const printWidth = width + (2 * bleed);
          const printHeight = height + (2 * bleed);
          doc.addImage(imgData, 'PNG', x, y, printWidth, printHeight, undefined, 'FAST');
        }
      }

      const cleanTitle = name.trim().replace(/[^a-z0-9]/gi, '_') || 'label';
      doc.save(`${cleanTitle}_Avery_${template.id}.pdf`);
    } catch (err: any) {
      console.error(err);
      showAlert('Export Error', 'An error occurred during print PDF generation: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Filter templates list
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.id.includes(searchQuery) || 
                          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesShape = shapeFilter === 'all' || t.shape === shapeFilter;
    return matchesSearch && matchesShape;
  });

  return (
    <div className="h-screen overflow-hidden bg-[#fcfaf7] flex flex-col font-sans text-[#3c2f2f]">
      
      {/* Header navbar */}
      <header className="h-16 border-b border-[#e2d6c9] bg-white/75 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl bg-white hover:bg-[#faf6f2] text-[#6d5c5a] hover:text-[#3c2f2f] border border-[#e2d6c9] transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xs font-bold tracking-wider text-[#9e8b89] uppercase">
              {openedFromTemplateBase ? 'USE TEMPLATE' : (activeDesign ? 'EDIT LABEL DESIGN' : 'NEW LABEL DESIGN')}
            </h1>
            <p className="text-sm font-bold text-[#3c2f2f]">
              {step === 1 && 'Step 1: Choose Template'}
              {step === 2 && 'Step 2: Design Label'}
              {step === 3 && 'Step 3: Save & Export'}
            </p>
          </div>
        </div>

        {/* Stepper bubbles - 3 steps now */}
        <div className="hidden md:flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <Fragment key={s}>
              <button 
                type="button"
                onClick={() => setStep(s)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all cursor-pointer focus:outline-none ${
                  step === s 
                    ? 'bg-[#dfa283] border-[#dfa283] text-white ring-4 ring-[#dfa283]/10' 
                    : step > s 
                      ? 'bg-[#f4ebe1] border-[#e2d6c9] text-[#dfa283]' 
                      : 'bg-white border-[#e2d6c9] text-[#9e8b89]'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </button>
              {s < 3 && <div className={`w-8 h-[1px] ${step > s ? 'bg-[#dfa283]' : 'bg-[#e2d6c9]'}`} />}
            </Fragment>
          ))}
        </div>
      </header>

      {/* Main Stepper Layout Panel */}
      <div className="flex-1 flex flex-col-reverse lg:flex-row overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: Steps Controls */}
        <aside className="w-full lg:w-[400px] xl:w-[440px] bg-white border-t lg:border-t-0 lg:border-r border-[#e2d6c9] flex flex-col flex-1 lg:flex-none lg:h-full overflow-hidden shrink-0 shadow-sm">
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* -------------------- STEP 1: SELECT TEMPLATE -------------------- */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#3c2f2f]">Select Avery Label Stock</h3>
                  <p className="text-[11px] text-[#6d5c5a]">Choose the exact layout code representing your physical Avery sheet.</p>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search stock code (e.g. 22807, 5160)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#e2d6c9] rounded-xl px-3.5 py-2 text-xs text-[#3c2f2f] placeholder-[#9e8b89] focus:outline-none focus:ring-2 focus:ring-[#dfa283]/50 focus:border-[#dfa283] transition-all shadow-sm"
                  />

                  <div className="flex flex-wrap gap-1 bg-[#faf6f2] p-1 rounded-xl border border-[#e2d6c9] shadow-inner">
                    {['all', 'circular', 'square', 'rectangular', 'oval'].map(s => (
                      <button
                        key={s}
                        onClick={() => setShapeFilter(s as any)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold capitalize cursor-pointer transition-all ${
                          shapeFilter === s 
                            ? 'bg-[#dfa283] text-white shadow-sm' 
                            : 'text-[#6d5c5a] hover:text-[#3c2f2f]'
                        }`}
                      >
                        {s === 'all' ? 'All' : s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Templates list */}
                <div className="space-y-2 lg:max-h-[50vh] lg:overflow-y-auto pr-1">
                  {filteredTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTemplate(t.id)}
                      className={`w-full text-left p-3.5 rounded-xl border hover:border-[#dfa283]/50 hover:bg-[#faf6f2] flex items-start gap-3 transition-all cursor-pointer group shadow-sm ${
                        editorState.templateId === t.id ? 'border-[#dfa283] bg-[#faf6f2]' : 'border-[#e2d6c9] bg-white'
                      }`}
                    >
                      <div className="p-2.5 rounded-lg bg-[#faf6f2] border border-[#e2d6c9] text-[#9e8b89] group-hover:text-[#dfa283] transition-colors shrink-0">
                        {t.shape === 'circular' && <Circle className="w-4 h-4" />}
                        {t.shape === 'square' && <Square className="w-4 h-4" />}
                        {t.shape === 'oval' && <div className="w-4 h-4 rounded-full border-2 border-current scale-y-[0.7] transform" />}
                        {t.shape === 'rectangular' && <div className="w-4 h-3.5 rounded border-2 border-current" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#3c2f2f] group-hover:text-[#dfa283] transition-colors">
                          {t.name}
                        </h4>
                        <p className="text-[10px] text-[#6d5c5a] mt-0.5 leading-relaxed">
                          {t.width}" x {t.height}" • {t.cols * t.rows} per sheet
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* -------------------- STEP 2: DESIGN (Background + Text combined) -------------------- */}
            {/* -------------------- STEP 2: DESIGN -------------------- */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#3c2f2f]">
                    {openedFromTemplateBase ? 'Fill in Product Details' : 'Design Label'}
                  </h3>
                  <p className="text-[11px] text-[#6d5c5a]">
                    {openedFromTemplateBase
                      ? 'Enter the text for this label — all styling is already set by the template.'
                      : 'Set background, artwork, and all text layers.'}
                  </p>
                </div>

                {/* ===== TEMPLATE BASE: content-only form ===== */}
                {openedFromTemplateBase ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-[#dfa283]/10 border border-[#dfa283]/25 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-[#dfa283] shrink-0" />
                      <p className="text-[11px] text-[#dfa283] font-semibold leading-snug">
                        Template styling is locked — just enter your product text below.
                      </p>
                    </div>

                    {editorState.titleEnabled && (
                      <div className="bg-white border border-[#e2d6c9] p-4 rounded-xl shadow-sm space-y-1.5">
                        <label className="block text-xs font-bold text-[#3c2f2f]">Product Title</label>
                        <input
                          type="text"
                          value={editorState.titleText}
                          onChange={(e) => handleStateChange('titleText', e.target.value)}
                          placeholder="e.g. Lavender Tallow Balm"
                          className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-lg px-3 py-2 text-sm text-[#3c2f2f] placeholder-[#9e8b89] focus:outline-none focus:ring-1 focus:ring-[#dfa283]"
                        />
                      </div>
                    )}

                    {editorState.subtitleEnabled && (
                      <div className="bg-white border border-[#e2d6c9] p-4 rounded-xl shadow-sm space-y-1.5">
                        <label className="block text-xs font-bold text-[#3c2f2f]">Subtitle</label>
                        <input
                          type="text"
                          value={editorState.subtitleText}
                          onChange={(e) => handleStateChange('subtitleText', e.target.value)}
                          placeholder="e.g. Whipped Body Butter"
                          className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-lg px-3 py-2 text-sm text-[#3c2f2f] placeholder-[#9e8b89] focus:outline-none focus:ring-1 focus:ring-[#dfa283]"
                        />
                      </div>
                    )}

                    {editorState.ingredientsEnabled && (
                      <div className="bg-white border border-[#e2d6c9] p-4 rounded-xl shadow-sm space-y-1.5">
                        <label className="block text-xs font-bold text-[#3c2f2f]">Ingredients / Details</label>
                        <textarea
                          value={editorState.ingredientsText}
                          onChange={(e) => handleStateChange('ingredientsText', e.target.value)}
                          placeholder="e.g. Ingredients: Beef Tallow, Lavender EO"
                          className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-lg px-3 py-2 text-sm text-[#3c2f2f] placeholder-[#9e8b89] h-28 resize-none focus:outline-none focus:ring-1 focus:ring-[#dfa283]"
                        />
                      </div>
                    )}
                  </div>

                ) : (
                  /* ===== FULL DESIGN FLOW ===== */
                  <>
                    {/* Mobile sub-tabs */}
                    <div className="flex bg-[#faf6f2] p-0.5 rounded-xl border border-[#e2d6c9] shadow-inner lg:hidden">
                      <button type="button" onClick={() => setDesignTab('background')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer ${designTab === 'background' ? 'bg-[#dfa283] text-white shadow-sm' : 'text-[#6d5c5a] hover:text-[#3c2f2f]'}`}>
                        Background
                      </button>
                      <button type="button" onClick={() => setDesignTab('text')} className={`flex-1 py-2 rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer ${designTab === 'text' ? 'bg-[#dfa283] text-white shadow-sm' : 'text-[#6d5c5a] hover:text-[#3c2f2f]'}`}>
                        Text Layers
                      </button>
                    </div>

                    {/* Background Section */}
                    <div className={`space-y-4 ${designTab === 'text' ? 'hidden lg:block' : ''}`}>
                      <h4 className="hidden lg:block text-[10px] font-extrabold tracking-widest text-[#9e8b89] uppercase">Background</h4>
                      <div className="bg-[#faf6f2] border border-[#e2d6c9] p-4 rounded-2xl shadow-sm">
                        <CustomColorPicker label="Background Fill Color" value={editorState.bgColor} onChange={(val) => handleStateChange('bgColor', val)} />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-[#6d5c5a]">Background Artwork / Logo</label>
                        {editorState.bgImageDataURL ? (
                          <div className="p-4 bg-white border border-[#e2d6c9] rounded-2xl space-y-3.5 shadow-sm">
                            <div className="flex items-center gap-3 bg-[#faf6f2] p-2.5 rounded-xl border border-[#e2d6c9]">
                              <img src={editorState.bgImageDataURL} alt="Thumbnail" className="w-12 h-12 object-contain bg-white border border-[#e2d6c9] rounded-lg shadow-sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#3c2f2f] truncate">Artwork Loaded</p>
                                <p className="text-[10px] text-[#dfa283] font-semibold">Saved in Cloud Workspace</p>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setShowGallery(true)}
                                  className="p-2 rounded-lg bg-white border border-[#e2d6c9] hover:border-[#dfa283]/60 hover:bg-[#faf6f2] text-[#6d5c5a] hover:text-[#dfa283] transition-all cursor-pointer shadow-sm"
                                  title="Browse Gallery"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button onClick={handleRemoveImage} className="p-2 rounded-lg bg-white border border-[#e2d6c9] hover:border-rose-200 hover:bg-rose-50 text-[#6d5c5a] hover:text-rose-600 transition-all cursor-pointer shadow-sm" title="Remove Image">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-4 border-t border-[#f4ebe1] pt-3.5">
                              <CustomSlider label="Image Zoom Scale" value={editorState.bgScale} min={10} max={300} unit="%" snapValue={100} snapThreshold={4} onChange={(val) => handleStateChange('bgScale', val)} />
                              <CustomSlider label="Image Horizontal Pos X" value={editorState.bgX} min={-50} max={150} unit="%" snapValue={50} snapThreshold={3} onChange={(val) => handleStateChange('bgX', val)} />
                              <CustomSlider label="Image Vertical Pos Y" value={editorState.bgY} min={-50} max={150} unit="%" snapValue={50} snapThreshold={3} onChange={(val) => handleStateChange('bgY', val)} />
                            </div>
                          </div>
                        ) : (
                          /* No image: Upload + Browse Gallery side by side */
                          <div className="grid grid-cols-2 gap-2">
                            {/* Upload dropzone */}
                            <div className="relative border-2 border-dashed border-[#e2d6c9] hover:border-[#dfa283] rounded-2xl p-4 text-center cursor-pointer transition-all bg-[#faf6f2]/40 group shadow-sm">
                              <input type="file" accept="image/*" onChange={handleImageFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} />
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="p-2.5 rounded-xl bg-white border border-[#e2d6c9] text-[#9e8b89] group-hover:text-[#dfa283] transition-colors shadow-sm">
                                  {uploading ? (
                                    <svg className="animate-spin h-4 w-4 text-[#dfa283]" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  ) : (
                                    <Upload className="w-4 h-4 group-hover:scale-105 transition-transform" />
                                  )}
                                </div>
                                <div className="text-[11px] text-[#6d5c5a] leading-tight">
                                  <span className="font-bold text-[#dfa283]">Upload New</span>
                                  <p className="text-[9px] text-[#9e8b89] mt-0.5">PNG, JPG, WEBP</p>
                                </div>
                              </div>
                            </div>

                            {/* Browse Gallery button */}
                            <button
                              type="button"
                              onClick={() => setShowGallery(true)}
                              className="border-2 border-dashed border-[#e2d6c9] hover:border-[#dfa283] rounded-2xl p-4 text-center cursor-pointer transition-all bg-[#faf6f2]/40 group shadow-sm flex flex-col items-center justify-center gap-2"
                            >
                              <div className="p-2.5 rounded-xl bg-white border border-[#e2d6c9] text-[#9e8b89] group-hover:text-[#dfa283] transition-colors shadow-sm">
                                <svg className="w-4 h-4 group-hover:scale-105 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="text-[11px] text-[#6d5c5a] leading-tight">
                                <span className="font-bold text-[#dfa283]">My Gallery</span>
                                <p className="text-[9px] text-[#9e8b89] mt-0.5">Reuse past images</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider (desktop only) */}
                    <div className="hidden lg:block h-px bg-[#e2d6c9]" />

                    {/* Text Layers Section */}
                    <div className={`space-y-6 text-[#3c2f2f] ${designTab === 'background' ? 'hidden lg:block' : ''}`}>
                      <h4 className="hidden lg:block text-[10px] font-extrabold tracking-widest text-[#9e8b89] uppercase">Text Layers</h4>

                      {/* Aesthetic Presets - collapsible */}
                      <div className="bg-white border border-[#e2d6c9] rounded-xl shadow-sm overflow-hidden">
                        <button type="button" onClick={() => setPresetsOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#faf6f2] transition-colors">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-[#3c2f2f]">
                            <Sparkles className="w-3.5 h-3.5 text-[#dfa283]" /> Aesthetic Presets
                          </span>
                          <span className="text-[10px] text-[#9e8b89]">{presetsOpen ? '▲' : '▼'}</span>
                        </button>
                        {presetsOpen && (
                          <div className="grid grid-cols-2 gap-2 px-4 pb-4 border-t border-[#f4ebe1] pt-3">
                            {PRESETS.map(p => (
                              <button key={p.id} onClick={() => applyPreset(p.config)} className="px-3 py-2 rounded-xl bg-[#faf6f2] border border-[#e2d6c9] hover:border-[#dfa283]/50 hover:bg-[#f4ebe1] text-left transition-all cursor-pointer">
                                <p className="text-[11px] font-bold text-[#3c2f2f]">{p.name}</p>
                                <p className="text-[9px] text-[#9e8b89] mt-0.5 capitalize truncate">{p.config.titleFont.split(' ')[0]} font</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 1. Title Layer */}
                      <div className="space-y-3 bg-white border border-[#e2d6c9] p-4 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#3c2f2f] uppercase tracking-wider">1. Title Layer</span>
                          <button onClick={() => handleStateChange('titleEnabled', !editorState.titleEnabled)} className="cursor-pointer text-[#9e8b89] hover:text-[#3c2f2f]">
                            {editorState.titleEnabled ? <ToggleRight className="w-8 h-8 text-[#dfa283]" /> : <ToggleLeft className="w-8 h-8" />}
                          </button>
                        </div>
                        {editorState.titleEnabled && (
                          <div className="space-y-3.5 pt-2.5 border-t border-[#f4ebe1]">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#6d5c5a] mb-1">Title Text</label>
                              <input type="text" value={editorState.titleText} onChange={(e) => handleStateChange('titleText', e.target.value)} className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-lg px-3 py-1.5 text-xs text-[#3c2f2f] focus:outline-none focus:ring-1 focus:ring-[#dfa283]" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <FontSelector label="Font Family" value={editorState.titleFont} onChange={(val) => handleStateChange('titleFont', val)} />
                              <div>
                                <label className="block text-[10px] font-semibold text-[#6d5c5a] mb-1">Weight</label>
                                <select value={editorState.titleFontWeight} onChange={(e) => handleStateChange('titleFontWeight', e.target.value as any)} className="w-full bg-white border border-[#e2d6c9] rounded-lg px-2 py-1.5 text-xs text-[#3c2f2f] focus:outline-none cursor-pointer">
                                  <option value="normal">Normal</option>
                                  <option value="bold">Bold</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <CustomColorPicker label="Text Color" value={editorState.titleColor} onChange={(val) => handleStateChange('titleColor', val)} />
                              <CustomSlider label="Font Size" value={editorState.titleSize} min={8} max={72} unit="pt" onChange={(val) => handleStateChange('titleSize', val)} />
                            </div>
                            <div className="space-y-3 pt-1 border-t border-[#faf6f2]">
                              <CustomSlider label="Horizontal Position X" value={editorState.titleX} min={0} max={100} unit="%" snapValue={50} snapThreshold={3} onChange={(val) => handleStateChange('titleX', val)} />
                              <CustomSlider label="Vertical Position Y" value={editorState.titleY} min={0} max={100} unit="%" snapValue={50} snapThreshold={3} onChange={(val) => handleStateChange('titleY', val)} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Subtitle Layer */}
                      <div className="space-y-3 bg-white border border-[#e2d6c9] p-4 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#3c2f2f] uppercase tracking-wider">2. Subtitle Layer</span>
                          <button onClick={() => handleStateChange('subtitleEnabled', !editorState.subtitleEnabled)} className="cursor-pointer text-[#9e8b89] hover:text-[#3c2f2f]">
                            {editorState.subtitleEnabled ? <ToggleRight className="w-8 h-8 text-[#dfa283]" /> : <ToggleLeft className="w-8 h-8" />}
                          </button>
                        </div>
                        {editorState.subtitleEnabled && (
                          <div className="space-y-3.5 pt-2.5 border-t border-[#f4ebe1]">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#6d5c5a] mb-1">Subtitle Text</label>
                              <input type="text" value={editorState.subtitleText} onChange={(e) => handleStateChange('subtitleText', e.target.value)} className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-lg px-3 py-1.5 text-xs text-[#3c2f2f] focus:outline-none focus:ring-1 focus:ring-[#dfa283]" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <FontSelector label="Font Family" value={editorState.subtitleFont} onChange={(val) => handleStateChange('subtitleFont', val)} />
                              <CustomSlider label="Font Size" value={editorState.subtitleSize} min={6} max={36} unit="pt" onChange={(val) => handleStateChange('subtitleSize', val)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <CustomColorPicker label="Text Color" value={editorState.subtitleColor} onChange={(val) => handleStateChange('subtitleColor', val)} />
                            </div>
                            <div className="space-y-3 pt-1 border-t border-[#faf6f2]">
                              <CustomSlider label="Horizontal Position X" value={editorState.subtitleX} min={0} max={100} unit="%" snapValue={50} snapThreshold={3} onChange={(val) => handleStateChange('subtitleX', val)} />
                              <CustomSlider label="Vertical Position Y" value={editorState.subtitleY} min={0} max={100} unit="%" snapValue={50} snapThreshold={3} onChange={(val) => handleStateChange('subtitleY', val)} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. Details Layer */}
                      <div className="space-y-3 bg-white border border-[#e2d6c9] p-4 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#3c2f2f] uppercase tracking-wider">3. Details Layer</span>
                          <button onClick={() => handleStateChange('ingredientsEnabled', !editorState.ingredientsEnabled)} className="cursor-pointer text-[#9e8b89] hover:text-[#3c2f2f]">
                            {editorState.ingredientsEnabled ? <ToggleRight className="w-8 h-8 text-[#dfa283]" /> : <ToggleLeft className="w-8 h-8" />}
                          </button>
                        </div>
                        {editorState.ingredientsEnabled && (
                          <div className="space-y-3.5 pt-2.5 border-t border-[#f4ebe1]">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#6d5c5a] mb-1">Details / Ingredients List</label>
                              <textarea value={editorState.ingredientsText} onChange={(e) => handleStateChange('ingredientsText', e.target.value)} className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-lg px-3 py-1.5 text-xs text-[#3c2f2f] h-16 resize-none focus:outline-none focus:ring-1 focus:ring-[#dfa283]" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <FontSelector label="Font Family" value={editorState.ingredientsFont} onChange={(val) => handleStateChange('ingredientsFont', val)} />
                              <div>
                                <label className="block text-[10px] font-semibold text-[#6d5c5a] mb-1">Alignment</label>
                                <div className="flex bg-[#faf6f2] rounded-lg border border-[#e2d6c9] p-0.5">
                                  {(['left', 'center', 'right'] as const).map(align => (
                                    <button key={align} type="button" onClick={() => handleStateChange('ingredientsAlign', align)} className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${editorState.ingredientsAlign === align ? 'bg-[#dfa283] text-white shadow-sm' : 'text-[#6d5c5a] hover:text-[#3c2f2f]'}`}>
                                      {align.substring(0, 3)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <CustomColorPicker label="Text Color" value={editorState.ingredientsColor} onChange={(val) => handleStateChange('ingredientsColor', val)} />
                              <CustomSlider label="Font Size" value={editorState.ingredientsSize} min={4} max={20} unit="pt" onChange={(val) => handleStateChange('ingredientsSize', val)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <CustomSlider label="Line Height" value={editorState.ingredientsLineHeight} min={1.0} max={2.5} step={0.1} unit="x" onChange={(val) => handleStateChange('ingredientsLineHeight', val)} />
                            </div>
                            <div className="flex items-center justify-between py-1.5 px-2 bg-[#faf6f2] rounded-lg border border-[#e2d6c9]">
                              <label className="text-[11px] font-semibold text-[#6d5c5a] select-none">Auto-Wrap Details Text</label>
                              <button type="button" onClick={() => handleStateChange('ingredientsWrap', !editorState.ingredientsWrap)} className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all cursor-pointer focus:outline-none ${editorState.ingredientsWrap ? 'bg-[#dfa283] border-[#dfa283] text-white shadow-sm shadow-[#dfa283]/20' : 'bg-white border-[#e2d6c9] text-transparent hover:border-[#dfa283]/60'}`}>
                                <Check className={`w-3 h-3 stroke-[3.5px] transition-transform duration-200 ${editorState.ingredientsWrap ? 'scale-100 animate-in zoom-in-50' : 'scale-0'}`} />
                              </button>
                            </div>
                            <div className="space-y-3 pt-1 border-t border-[#faf6f2]">
                              <CustomSlider label="Horizontal Position X" value={editorState.ingredientsX} min={0} max={100} unit="%" snapValue={50} snapThreshold={3} onChange={(val) => handleStateChange('ingredientsX', val)} />
                              <CustomSlider label="Vertical Position Y" value={editorState.ingredientsY} min={0} max={100} unit="%" snapValue={50} snapThreshold={3} onChange={(val) => handleStateChange('ingredientsY', val)} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Preset Share Panel */}
                      <PresetSharePanel editorState={editorState} setEditorState={setEditorState} showAlert={showAlert} />
                    </div>
                  </>
                )}

              </div>
            )}

            {/* -------------------- STEP 3: REVIEW & SAVE -------------------- */}
            {step === 3 && (
              <div className="space-y-5 text-[#3c2f2f]">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#3c2f2f]">Save & Export</h3>
                  <p className="text-[11px] text-[#6d5c5a]">
                  {openedFromTemplateBase
                    ? `Name your label and save it to your library, or export directly to PDF.`
                    : `Specify design meta and download print-ready grid matrix PDF.`}
                </p>
                </div>

                {/* Name input - always shown */}
                <div className="space-y-2 bg-white border border-[#e2d6c9] p-4 rounded-xl shadow-sm">
                  <div>
                    <label className="block text-xs font-semibold text-[#6d5c5a] mb-1">
                      {openedFromTemplateBase ? 'Label Name' : 'Design Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={openedFromTemplateBase ? 'e.g. Lavender Soap – Batch 3' : 'e.g. Lavender Soap Label'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-lg px-3 py-2 text-xs text-[#3c2f2f] placeholder-[#9e8b89] focus:outline-none focus:ring-1 focus:ring-[#dfa283]"
                    />
                  </div>

                  {/* Template base flow: show only "Save as Label" */}
                  {openedFromTemplateBase ? (
                    <button
                      onClick={handleSaveToLibrary}
                      disabled={saving}
                      className="w-full bg-[#dfa283] hover:bg-[#d48e6c] text-white py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-3 disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving Label...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" /> SAVE AS LABEL
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      {/* Full flow: template base checkbox + save button */}
                      <div className="flex flex-col gap-2.5 pt-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setIsTemplateBase(!isTemplateBase)}
                          className="text-[11px] text-[#6d5c5a] cursor-pointer select-none flex items-center gap-2 focus:outline-none"
                        >
                          <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                            isTemplateBase
                              ? 'bg-[#dfa283] border-[#dfa283] text-white shadow-sm shadow-[#dfa283]/20'
                              : 'bg-white border-[#e2d6c9] text-transparent hover:border-[#dfa283]/60'
                          }`}>
                            <Check className={`w-3.5 h-3.5 stroke-[3px] transition-transform ${isTemplateBase ? 'scale-100' : 'scale-0'}`} />
                          </div>
                          Save as a "Template Base"
                        </button>
                        <p className="text-[10px] text-[#9e8b89] leading-relaxed">
                          Template bases save your background and layout as a reusable starting point.
                        </p>
                      </div>

                      <button
                        onClick={handleSaveToLibrary}
                        disabled={saving}
                        className="w-full bg-[#dfa283] hover:bg-[#d48e6c] text-white py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-3"
                      >
                        {saving ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Syncing to Cloud...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" /> SAVE TO MY HUB
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Export PDF card - always shown */}
                <div className="space-y-3 bg-[#faf6f2] border border-[#e2d6c9] p-4 rounded-xl shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[9px] font-extrabold tracking-widest text-[#dfa283] uppercase">Print Ready</span>
                    <h4 className="text-xs font-bold text-[#3c2f2f]">Export PDF Sheet</h4>
                    <p className="text-[10px] text-[#6d5c5a] leading-normal">
                      Downloads a full {selectedTemplate.name} sheet at 300 DPI — ready to print.
                    </p>
                  </div>

                  <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="w-full bg-gradient-to-r from-[#dfa283] to-[#e5bda7] hover:from-[#d48e6c] hover:to-[#dfa283] text-white py-3 rounded-lg text-xs font-bold tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                  >
                    {exporting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Compiling 300 DPI PDF...
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" /> EXPORT PDF SHEET
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Stepper Footer Controls */}
          <footer className="p-4 border-t border-[#e2d6c9] bg-[#faf6f2] shrink-0 flex items-center justify-between shadow-inner">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onBackToDashboard()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#faf6f2] text-[#6d5c5a] hover:text-[#3c2f2f] text-xs font-bold tracking-wide transition-all border border-[#e2d6c9] cursor-pointer shadow-sm"
            >
              Back
            </button>
            
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 rounded-xl bg-[#dfa283] hover:bg-[#d48e6c] text-white text-xs font-bold tracking-wide transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onBackToDashboard}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#faf6f2] text-[#6d5c5a] hover:text-[#3c2f2f] text-xs font-bold tracking-wide transition-all border border-[#e2d6c9] cursor-pointer shadow-sm"
              >
                Done
              </button>
            )}
          </footer>

        </aside>

        {/* RIGHT COLUMN: Live Interactive Preview Stage */}
        <main className="w-full h-[32vh] lg:h-full lg:flex-1 bg-[#fcfaf7] flex flex-col overflow-hidden">
          
          {/* Stage Navbar */}
          <header className="hidden lg:flex h-14 border-b border-[#e2d6c9] items-center justify-between px-6 bg-white/50 shrink-0 select-none">
            <h3 className="text-xs font-bold text-[#6d5c5a] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Studio Preview
            </h3>

            {/* Layout Toggles */}
            <div className="flex items-center gap-4">
              
              {/* Toggle Safetyzone */}
              <button
                type="button"
                onClick={() => handleStateChange('showSafetyZone', !editorState.showSafetyZone)}
                className="flex items-center gap-2 bg-white border border-[#e2d6c9] px-3 py-1.5 rounded-lg text-[11px] text-[#6d5c5a] font-semibold select-none shadow-sm cursor-pointer focus:outline-none"
              >
                <span>Safety Margins</span>
                <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                  editorState.showSafetyZone
                    ? 'bg-[#dfa283] border-[#dfa283] text-white shadow-xs'
                    : 'bg-[#faf6f2] border-[#e2d6c9] text-transparent hover:border-[#dfa283]/60'
                }`}>
                  <Check className={`w-2.5 h-2.5 stroke-[3.5px] transition-transform ${editorState.showSafetyZone ? 'scale-100' : 'scale-0'}`} />
                </div>
              </button>

              {/* Single vs Sheet view toggles */}
              <div className="bg-white p-0.5 rounded-lg border border-[#e2d6c9] inline-flex shadow-sm">
                <button
                  onClick={() => handleStateChange('viewMode', 'single')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all cursor-pointer ${
                    editorState.viewMode === 'single'
                      ? 'bg-[#dfa283] text-white shadow-sm'
                      : 'text-[#6d5c5a] hover:text-[#3c2f2f]'
                  }`}
                >
                  Single Label
                </button>
                <button
                  onClick={() => handleStateChange('viewMode', 'sheet')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all cursor-pointer ${
                    editorState.viewMode === 'sheet'
                      ? 'bg-[#dfa283] text-white shadow-sm'
                      : 'text-[#6d5c5a] hover:text-[#3c2f2f]'
                  }`}
                >
                  Full Sheet
                </button>
              </div>
            </div>
          </header>

          {/* Interactivity preview stage */}
          <div className="flex-1 overflow-auto p-4 lg:p-8 flex items-center justify-center relative bg-[radial-gradient(#e2d6c9_1px,transparent_1px)] [background-size:16px_16px]">
            
            {/* Mobile View Toggles Floating Bar */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2 lg:hidden">
              {/* Compact Safety Margins Toggle */}
              <button
                type="button"
                onClick={() => handleStateChange('showSafetyZone', !editorState.showSafetyZone)}
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs border border-[#e2d6c9] px-2.5 py-1.5 rounded-xl text-[10px] text-[#6d5c5a] font-bold select-none shadow-md cursor-pointer focus:outline-none"
              >
                <span>Safety</span>
                <div className={`w-3 h-3 rounded-md border flex items-center justify-center transition-all ${
                  editorState.showSafetyZone
                    ? 'bg-[#dfa283] border-[#dfa283] text-white'
                    : 'bg-white border-[#e2d6c9] text-transparent'
                }`}>
                  <Check className="w-2 h-2 stroke-[4px]" />
                </div>
              </button>

              {/* Compact Single vs Sheet View Toggle */}
              <div className="bg-white/80 backdrop-blur-xs p-0.5 rounded-xl border border-[#e2d6c9] inline-flex shadow-md">
                <button
                  onClick={() => handleStateChange('viewMode', 'single')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold tracking-wider transition-all cursor-pointer ${
                    editorState.viewMode === 'single'
                      ? 'bg-[#dfa283] text-white shadow-sm'
                      : 'text-[#6d5c5a]'
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => handleStateChange('viewMode', 'sheet')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold tracking-wider transition-all cursor-pointer ${
                    editorState.viewMode === 'sheet'
                      ? 'bg-[#dfa283] text-white shadow-sm'
                      : 'text-[#6d5c5a]'
                  }`}
                >
                  Sheet
                </button>
              </div>
            </div>

            <div className="relative flex flex-col items-center justify-center w-full max-w-4xl h-full">
              
              {/* Studio Canvas Component */}
              <div className="relative border border-[#e2d6c9] p-2 sm:p-6 md:p-8 bg-white/70 backdrop-blur rounded-2xl shadow-xl flex items-center justify-center max-w-full max-h-full lg:max-h-[70vh] overflow-hidden group">
                <StudioCanvas 
                  template={selectedTemplate} 
                  state={{
                    ...editorState,
                    titleEnabled: step >= 2 ? editorState.titleEnabled : false,
                    subtitleEnabled: step >= 2 ? editorState.subtitleEnabled : false,
                    ingredientsEnabled: step >= 2 ? editorState.ingredientsEnabled : false
                  }}
                />
              </div>

              <p className="hidden lg:block mt-4 text-[10px] text-[#9e8b89] text-center select-none max-w-md">
                *Dashed boundaries (<span className="text-[#6d5c5a] border-b border-dashed border-[#e2d6c9]">gray: cut line</span>; <span className="text-emerald-600 border-b border-dashed border-emerald-300">green: safety limits</span>) help align artwork and print text correctly. They will not export in the printed PDF.
              </p>

            </div>
          </div>

        </main>

      </div>

      {/* Image Gallery Modal */}
      {showGallery && (
        <ImageGallery
          token={token}
          onSelect={(url) => {
            handleStateChange('bgImageDataURL', url);
            handleStateChange('bgScale', 100);
            handleStateChange('bgX', 50);
            handleStateChange('bgY', 50);
          }}
          onClose={() => setShowGallery(false)}
          onUpload={async (e) => {
            await handleImageFile(e);
            setShowGallery(false);
          }}
          uploading={uploading}
        />
      )}

    </div>
  );
}
