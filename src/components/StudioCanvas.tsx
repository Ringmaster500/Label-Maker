import { useEffect, useRef, useState } from 'react';
import { AveryTemplate, LabelState } from '../types';
import { drawLabel, drawSheet } from '../utils/canvasEngine';

interface StudioCanvasProps {
  template: AveryTemplate;
  state: LabelState;
  customWidth?: number;
  customHeight?: number;
  className?: string;
}

export default function StudioCanvas({
  template,
  state,
  customWidth,
  customHeight,
  className = ''
}: StudioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [isFontReady, setIsFontReady] = useState(false);

  // Preload background image reactively
  useEffect(() => {
    if (!state.bgColor && !state.bgImageDataURL) {
      setBgImage(null);
      return;
    }

    if (!state.bgImageDataURL) {
      setBgImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous'; // critical for preventing canvas taining if CORS applies
    img.onload = () => {
      setBgImage(img);
    };
    img.onerror = () => {
      console.error('Failed to load canvas background artwork: ' + state.bgImageDataURL);
      setBgImage(null);
    };
    img.src = state.bgImageDataURL;
  }, [state.bgImageDataURL]);

  // Wait for Google Fonts to be ready in the document
  useEffect(() => {
    let active = true;
    const checkFont = async () => {
      const titleSpec = `${state.titleFontStyle || 'normal'} ${state.titleFontWeight || 'normal'} 16px "${state.titleFont}"`;
      const subtitleSpec = `${state.subtitleFontStyle || 'normal'} ${state.subtitleFontWeight || 'normal'} 16px "${state.subtitleFont}"`;
      const ingredientsSpec = `${state.ingredientsFontStyle || 'normal'} ${state.ingredientsFontWeight || 'normal'} 16px "${state.ingredientsFont}"`;

      try {
        await Promise.all([
          document.fonts.load(titleSpec),
          document.fonts.load(subtitleSpec),
          document.fonts.load(ingredientsSpec)
        ]);
        if (active) {
          setIsFontReady(prev => !prev); // Toggle to trigger redraw
        }
      } catch (e) {
        console.warn('Font checking error:', e);
      }
    };

    checkFont();

    const handleLoaded = () => {
      if (active) setIsFontReady(prev => !prev);
    };
    document.fonts.addEventListener('loadingdone', handleLoaded);
    return () => {
      active = false;
      document.fonts.removeEventListener('loadingdone', handleLoaded);
    };
  }, [
    state.titleFont, 
    state.subtitleFont, 
    state.ingredientsFont, 
    state.titleFontWeight,
    state.titleFontStyle,
    state.subtitleFontWeight,
    state.subtitleFontStyle,
    state.ingredientsFontWeight,
    state.ingredientsFontStyle
  ]);

  // Redraw hook
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (customWidth && customHeight) {
      // Thumbnail Render Mode (always single label)
      canvas.width = customWidth;
      canvas.height = customHeight;
      drawLabel(ctx, template, { ...state, showSafetyZone: false }, bgImage, true);
    } else {
      // Editor Preview Mode
      if (state.viewMode === 'single') {
        canvas.width = template.width * 300; // Render single label at high-res 300 DPI
        canvas.height = template.height * 300;
        canvas.style.aspectRatio = `${template.width} / ${template.height}`;
        
        drawLabel(ctx, template, state, bgImage, false);
      } else {
        canvas.width = 8.5 * 150; // Render sheet page grid at 150 DPI for display performance
        canvas.height = 11 * 150;
        canvas.style.aspectRatio = '8.5 / 11';
        
        drawSheet(ctx, template, state, bgImage);
      }
    }
  }, [template, state, bgImage, customWidth, customHeight, isFontReady]);

  return (
    <canvas
      ref={canvasRef}
      className={`shadow-2xl bg-white max-w-full rounded transition-all duration-300 ${
        state.viewMode === 'single' ? 'max-h-[24vh] lg:max-h-[64vh]' : 'max-h-[24vh] lg:max-h-[72vh]'
      } ${className}`}
      style={
        customWidth && customHeight
          ? { width: customWidth, height: customHeight }
          : undefined
      }
    />
  );
}
