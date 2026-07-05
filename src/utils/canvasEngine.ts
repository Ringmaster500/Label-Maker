import { AveryTemplate, LabelState } from '../types';

export function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: 'left' | 'center' | 'right'
) {
  ctx.textAlign = align;
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  paragraphs.forEach(paragraph => {
    if (paragraph.trim() === '') {
      lines.push('');
      return;
    }
    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  });

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
}

export function getAvailableWidthAtY(
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  shape: 'circular' | 'square' | 'rectangular' | 'oval',
  paddingPercent: number
): number {
  const padding = (paddingPercent / 100) * canvasWidth;
  const cY = canvasHeight / 2;

  if (shape === 'circular') {
    const R = canvasWidth / 2;
    const d = Math.abs(y - cY);
    if (d >= R) return 20; // safe fallback
    return Math.max(20, 2 * Math.sqrt(R * R - d * d) - 2 * padding);
  } else if (shape === 'oval') {
    const Rx = canvasWidth / 2;
    const Ry = canvasHeight / 2;
    const d = Math.abs(y - cY);
    if (d >= Ry) return 20; // safe fallback
    return Math.max(20, 2 * Rx * Math.sqrt(1 - (d * d) / (Ry * Ry)) - 2 * padding);
  }

  return canvasWidth - 2 * padding;
}

export function drawWrappedTextDynamic(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  lineHeight: number,
  align: 'left' | 'center' | 'right',
  canvasWidth: number,
  canvasHeight: number,
  shape: 'circular' | 'square' | 'rectangular' | 'oval',
  paddingPercent: number,
  manualWidth: number,
  autoFit: boolean
) {
  ctx.textAlign = align;
  const paragraphs = text.split('\n');
  const lines: { text: string; y: number }[] = [];

  let currentY = y;

  paragraphs.forEach(paragraph => {
    if (paragraph.trim() === '') {
      lines.push({ text: '', y: currentY });
      currentY += lineHeight;
      return;
    }
    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);

      let activeWidth = manualWidth;
      if (autoFit) {
        const shapeWidth = getAvailableWidthAtY(currentY, canvasWidth, canvasHeight, shape, paddingPercent);
        activeWidth = Math.min(manualWidth, shapeWidth);
      }

      if (metrics.width > activeWidth && currentLine) {
        lines.push({ text: currentLine, y: currentY });
        currentY += lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push({ text: currentLine, y: currentY });
      currentY += lineHeight;
    }
  });

  lines.forEach(line => {
    let activeWidth = manualWidth;
    if (autoFit) {
      const shapeWidth = getAvailableWidthAtY(line.y, canvasWidth, canvasHeight, shape, paddingPercent);
      activeWidth = Math.min(manualWidth, shapeWidth);
    }
    let drawX = x;
    if (align === 'left') {
      drawX = x - activeWidth / 2;
    } else if (align === 'right') {
      drawX = x + activeWidth / 2;
    }
    ctx.fillText(line.text, drawX, line.y);
  });
}

export function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

export function drawCornerBrackets(ctx: CanvasRenderingContext2D, w: number, h: number, inset: number, len: number) {
  // top left
  ctx.beginPath();
  ctx.moveTo(inset + len, inset);
  ctx.lineTo(inset, inset);
  ctx.lineTo(inset, inset + len);
  ctx.stroke();

  // top right
  ctx.beginPath();
  ctx.moveTo(w - inset - len, inset);
  ctx.lineTo(w - inset, inset);
  ctx.lineTo(w - inset, inset + len);
  ctx.stroke();

  // bottom left
  ctx.beginPath();
  ctx.moveTo(inset + len, h - inset);
  ctx.lineTo(inset, h - inset);
  ctx.lineTo(inset, h - inset + len);
  ctx.stroke();

  // bottom right
  ctx.beginPath();
  ctx.moveTo(w - inset - len, h - inset);
  ctx.lineTo(w - inset, h - inset);
  ctx.lineTo(w - inset, h - inset + len);
  ctx.stroke();
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  template: AveryTemplate,
  state: Omit<LabelState, 'viewMode' | 'showSafetyZone'> & { showSafetyZone?: boolean },
  bgImageElement: HTMLImageElement | null,
  forPrint = false
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const scaleDPI = width / template.width; // DPI multiplier based on target canvas width

  // 1. Clear background
  ctx.clearRect(0, 0, width, height);

  // Save context state before clipping image/content to boundaries
  ctx.save();

  // Setup boundary clip path
  if (template.shape === 'circular') {
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width / 2, 0, 2 * Math.PI);
    ctx.clip();
  } else if (template.shape === 'oval') {
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
    ctx.clip();
  } else if (template.shape === 'rectangular' && template.id !== '5165' && template.id !== '8165') {
    const cornerRad = 0.09 * scaleDPI;
    drawRoundedRectPath(ctx, 0, 0, width, height, cornerRad);
    ctx.clip();
  }

  // 2. Draw label fill color
  ctx.fillStyle = state.bgColor;
  ctx.fillRect(0, 0, width, height);

  // 3. Draw Background Image
  if (bgImageElement && bgImageElement.complete && bgImageElement.naturalWidth > 0) {
    const imgWidth = width * (state.bgScale / 100);
    const imgHeight = imgWidth * (bgImageElement.naturalHeight / bgImageElement.naturalWidth);
    const imgX = (state.bgX / 100) * width - imgWidth / 2;
    const imgY = (state.bgY / 100) * height - imgHeight / 2;
    ctx.drawImage(bgImageElement, imgX, imgY, imgWidth, imgHeight);
  }

  // ==================== SIMULATE INGREDIENTS LAYOUT FOR ORNAMENT FOCUS ====================
  const ingLines: string[] = [];
  let ingredientsFontSize = 0;
  let ingredientsLineHeight = 0;
  let ingredientsFontWeight = 'normal';
  let ingredientsFontStyle = 'normal';
  let ingY = 0;
  let textBlockWidth = 0;
  let textBlockHeight = 0;

  if (state.ingredientsEnabled && state.ingredientsText.trim() !== '') {
    ingredientsFontSize = state.ingredientsSize * (scaleDPI / 72);
    ingredientsLineHeight = ingredientsFontSize * state.ingredientsLineHeight;
    ingredientsFontWeight = state.ingredientsFontWeight || 'normal';
    ingredientsFontStyle = state.ingredientsFontStyle || 'normal';
    ctx.font = `${ingredientsFontStyle} ${ingredientsFontWeight} ${ingredientsFontSize}px "${state.ingredientsFont}"`;
    ctx.textBaseline = 'top';

    ingY = (state.ingredientsY / 100) * height;
    
    const wrapPercent = state.ingredientsWidthPercent ?? 82;
    const manualWrapWidth = width * (wrapPercent / 100);
    const autoFit = state.ingredientsAutoFit ?? true;

    const paragraphs = state.ingredientsText.split('\n');
    let currentY = ingY;
    
    paragraphs.forEach(paragraph => {
      if (paragraph.trim() === '') {
        ingLines.push('');
        currentY += ingredientsLineHeight;
        return;
      }
      const words = paragraph.split(/\s+/);
      let currentLine = '';
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? currentLine + ' ' + word : word;
        
        let activeWidth = manualWrapWidth;
        if (autoFit && state.ingredientsWrap) {
          const shapeWidth = getAvailableWidthAtY(currentY, width, height, template.shape, 9);
          activeWidth = Math.min(manualWrapWidth, shapeWidth);
        }
        
        const metrics = ctx.measureText(testLine);
        if (state.ingredientsWrap && metrics.width > activeWidth && currentLine) {
          ingLines.push(currentLine);
          const lineW = ctx.measureText(currentLine).width;
          if (lineW > textBlockWidth) textBlockWidth = lineW;
          currentY += ingredientsLineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        ingLines.push(currentLine);
        const lineW = ctx.measureText(currentLine).width;
        if (lineW > textBlockWidth) textBlockWidth = lineW;
        currentY += ingredientsLineHeight;
      }
    });

    textBlockHeight = ingLines.length * ingredientsLineHeight;
  }

  // ==================== UNIFIED ACCENT CONTROLS ====================
  const cX = width / 2;
  const aColor = state.accentColor || '#000000';
  let aThickness = 1 * (scaleDPI / 72);
  if (state.accentWeight === 'medium') aThickness = 2 * (scaleDPI / 72);
  if (state.accentWeight === 'thick') aThickness = 4.5 * (scaleDPI / 72);

  const drawBorderContour = (offset: number) => {
    if (template.shape === 'circular') {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.max(0.1, width / 2 - offset), 0, 2 * Math.PI);
      ctx.stroke();
    } else if (template.shape === 'oval') {
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, Math.max(0.1, width / 2 - offset), Math.max(0.1, height / 2 - offset), 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      const cornerRad = template.id !== '5165' && template.id !== '8165' ? Math.max(0.01, 0.09 * scaleDPI - offset) : 0;
      if (cornerRad > 0) {
        drawRoundedRectPath(ctx, offset, offset, width - 2 * offset, height - 2 * offset, cornerRad);
        ctx.stroke();
      } else {
        ctx.strokeRect(offset, offset, width - 2 * offset, height - 2 * offset);
      }
    }
  };

  const drawAccentDivider = (yCoord: number, style: string) => {
    ctx.save();
    ctx.strokeStyle = aColor;
    ctx.fillStyle = aColor;
    ctx.lineWidth = aThickness;

    const dividerLength = width * 0.40;

    if (style === 'dashed') {
      ctx.setLineDash([4 * (scaleDPI / 72), 3 * (scaleDPI / 72)]);
    }

    if (style === 'double') {
      const gap = 2 * (scaleDPI / 72);
      ctx.beginPath();
      ctx.moveTo(cX - dividerLength / 2, yCoord - gap);
      ctx.lineTo(cX + dividerLength / 2, yCoord - gap);
      ctx.moveTo(cX - dividerLength / 2, yCoord + gap);
      ctx.lineTo(cX + dividerLength / 2, yCoord + gap);
      ctx.stroke();
    } else if (style === 'pizazz') {
      const centerSize = 4.5 * (scaleDPI / 72);
      const gap = centerSize * 2.5;

      ctx.beginPath();
      ctx.moveTo(cX - dividerLength / 2, yCoord);
      ctx.lineTo(cX - gap / 2, yCoord);
      ctx.moveTo(cX + gap / 2, yCoord);
      ctx.lineTo(cX + dividerLength / 2, yCoord);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cX, yCoord - centerSize);
      ctx.lineTo(cX + centerSize, yCoord);
      ctx.moveTo(cX, yCoord + centerSize);
      ctx.lineTo(cX - centerSize, yCoord);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(cX - dividerLength / 2, yCoord);
      ctx.lineTo(cX + dividerLength / 2, yCoord);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawAccentSideLines = (yFocus: number, textWidth: number, style: string, severity: string = 'normal') => {
    ctx.save();
    ctx.strokeStyle = aColor;
    ctx.lineWidth = aThickness;

    const spacing = 8 * (scaleDPI / 72);
    const length = 15 * (scaleDPI / 72);
    
    const textHalfW = (textWidth / 2) || (width * 0.15);
    const leftInnerX = cX - textHalfW - spacing;
    const rightInnerX = cX + textHalfW + spacing;
    
    if (style === 'angledDown' || style === 'angledUp' || style === 'angled') {
      let angleDegrees = 12;
      if (severity === 'mild') angleDegrees = 6;
      else if (severity === 'steep') angleDegrees = 22;

      const theta = angleDegrees * Math.PI / 180;
      const yOffset = style === 'angledUp' ? -length * Math.sin(theta) : length * Math.sin(theta);

      ctx.beginPath();
      ctx.moveTo(leftInnerX, yFocus);
      ctx.lineTo(leftInnerX - length, yFocus + yOffset);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightInnerX, yFocus);
      ctx.lineTo(rightInnerX + length, yFocus + yOffset);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(leftInnerX, yFocus);
      ctx.lineTo(leftInnerX - length, yFocus);
      ctx.moveTo(rightInnerX, yFocus);
      ctx.lineTo(rightInnerX + length, yFocus);
      ctx.stroke();
    }
    ctx.restore();
  };

  // A. Draw Border
  if (state.borderEnabled) {
    ctx.save();
    ctx.strokeStyle = aColor;
    ctx.lineWidth = aThickness;
    const style = state.borderStyle || 'thin';

    if (style === 'thin') {
      drawBorderContour(width * 0.05);
    } else if (style === 'double') {
      const spacing = 2.5 * (scaleDPI / 72);
      drawBorderContour(width * 0.05 - spacing);
      drawBorderContour(width * 0.05 + spacing);
    } else if (style === 'dashed') {
      ctx.save();
      ctx.setLineDash([6 * (scaleDPI / 72), 4 * (scaleDPI / 72)]);
      drawBorderContour(width * 0.05);
      ctx.restore();
    } else if (style === 'thick') {
      ctx.lineWidth = aThickness * 2.2;
      drawBorderContour(width * 0.025);
    } else if (style === 'doubleRing') {
      drawBorderContour(width * 0.015);
      drawBorderContour(width * 0.035);
    } else if (style === 'softRing') {
      ctx.save();
      ctx.lineWidth = 0.8 * (scaleDPI / 72);
      ctx.globalAlpha = 0.25;
      drawBorderContour(width * 0.08);
      ctx.restore();
    } else if (style === 'corners' && (template.shape === 'rectangular' || template.shape === 'square')) {
      drawCornerBrackets(ctx, width, height, width * 0.04, 12 * (scaleDPI / 72));
    }
    ctx.restore();
  }

  // B. Title Accents
  if (state.titleEnabled && state.titleText.trim() !== '') {
    const titleFontSize = state.titleSize * (scaleDPI / 72);
    ctx.font = `${state.titleFontStyle || 'normal'} ${state.titleFontWeight || 'bold'} ${titleFontSize}px "${state.titleFont}"`;
    const titleW = ctx.measureText(state.titleText).width;
    const titleY = (state.titleY / 100) * height;

    if (state.titleAccentType === 'sideLines') {
      drawAccentSideLines(titleY, titleW, state.titleAccentStyle || 'angledDown', state.titleAccentSeverity || 'normal');
    } else if (state.titleAccentType === 'divider') {
      drawAccentDivider(titleY + titleFontSize / 2 + 8 * (scaleDPI / 72), state.titleAccentStyle || 'solid');
    }
  }

  // C. Subtitle Accents
  if (state.subtitleEnabled && state.subtitleText.trim() !== '') {
    const subtitleFontSize = state.subtitleSize * (scaleDPI / 72);
    const subtitleY = (state.subtitleY / 100) * height;

    if (state.subtitleAccentType === 'divider') {
      drawAccentDivider(subtitleY + subtitleFontSize / 2 + 8 * (scaleDPI / 72), state.subtitleAccentStyle || 'solid');
    }
  }

  // D. Details Layer Accents
  if (state.ingredientsEnabled && state.ingredientsText.trim() !== '') {
    if (state.detailsSideLinesEnabled && textBlockHeight > 0) {
      const align = state.detailsSideLinesAlign || 'middle';
      let yFocus = ingY + textBlockHeight * 0.5;
      if (align === 'top') {
        yFocus = ingY + textBlockHeight * 0.16;
      } else if (align === 'bottom') {
        yFocus = ingY + textBlockHeight * 0.84;
      }
      drawAccentSideLines(yFocus, textBlockWidth, state.detailsSideLinesStyle || 'angledDown', state.detailsSideLinesSeverity || 'normal');
    }

    if (state.detailsDividerEnabled) {
      drawAccentDivider(ingY - 8 * (scaleDPI / 72), state.detailsDividerStyle || 'solid');
    }

    if (state.detailsOrnamentEnabled) {
      ctx.save();
      ctx.fillStyle = aColor;
      ctx.strokeStyle = aColor;
      ctx.lineWidth = aThickness;

      const style = state.detailsOrnamentStyle || 'star';
      if (style === 'star') {
        drawStar(ctx, cX, ingY - 8 * (scaleDPI / 72), 5, 4.5 * (scaleDPI / 72), 2 * (scaleDPI / 72));
      } else if (style === 'dot') {
        ctx.beginPath();
        ctx.arc(cX, ingY - 8 * (scaleDPI / 72), 3 * (scaleDPI / 72), 0, 2 * Math.PI);
        ctx.fill();
      } else if (style === 'flankingDots' && textBlockHeight > 0) {
        const yFocus = ingY + textBlockHeight * 0.5;
        const spacing = 8 * (scaleDPI / 72);
        const textHalfW = (textBlockWidth / 2) || (width * 0.15);
        const dotR = 1.8 * (scaleDPI / 72);
        const dotGap = 4 * (scaleDPI / 72);
        
        const leftX = cX - textHalfW - spacing;
        ctx.beginPath();
        ctx.arc(leftX, yFocus, dotR, 0, 2 * Math.PI);
        ctx.arc(leftX - dotGap, yFocus, dotR, 0, 2 * Math.PI);
        ctx.arc(leftX - dotGap * 2, yFocus, dotR, 0, 2 * Math.PI);
        ctx.fill();

        const rightX = cX + textHalfW + spacing;
        ctx.beginPath();
        ctx.arc(rightX, yFocus, dotR, 0, 2 * Math.PI);
        ctx.arc(rightX + dotGap, yFocus, dotR, 0, 2 * Math.PI);
        ctx.arc(rightX + dotGap * 2, yFocus, dotR, 0, 2 * Math.PI);
        ctx.fill();
      } else if (style === 'bottomFlourish' && textBlockHeight > 0) {
        const yFocus = ingY + textBlockHeight + 8 * (scaleDPI / 72);
        const len = 12 * (scaleDPI / 72);
        ctx.beginPath();
        ctx.moveTo(cX - len, yFocus - 2 * (scaleDPI / 72));
        ctx.lineTo(cX, yFocus + 1.5 * (scaleDPI / 72));
        ctx.lineTo(cX + len, yFocus - 2 * (scaleDPI / 72));
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 4. Render Product Title Layer
  if (state.titleEnabled && state.titleText.trim() !== '') {
    const titleFontSize = state.titleSize * (scaleDPI / 72);
    const titleFontStyle = state.titleFontStyle || 'normal';
    ctx.font = `${titleFontStyle} ${state.titleFontWeight} ${titleFontSize}px "${state.titleFont}"`;
    ctx.fillStyle = state.titleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.titleText, (state.titleX / 100) * width, (state.titleY / 100) * height);
  }

  // 5. Render Subtitle Layer
  if (state.subtitleEnabled && state.subtitleText.trim() !== '') {
    const subtitleFontSize = state.subtitleSize * (scaleDPI / 72);
    const subtitleFontWeight = state.subtitleFontWeight || 'normal';
    const subtitleFontStyle = state.subtitleFontStyle || 'normal';
    ctx.font = `${subtitleFontStyle} ${subtitleFontWeight} ${subtitleFontSize}px "${state.subtitleFont}"`;
    ctx.fillStyle = state.subtitleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.subtitleText, (state.subtitleX / 100) * width, (state.subtitleY / 100) * height);
  }

  // 6. Render Ingredients / Details Layer
  if (state.ingredientsEnabled && state.ingredientsText.trim() !== '') {
    const ingredientsFontSize = state.ingredientsSize * (scaleDPI / 72);
    const ingredientsLineHeight = ingredientsFontSize * state.ingredientsLineHeight;
    const ingredientsFontWeight = state.ingredientsFontWeight || 'normal';
    const ingredientsFontStyle = state.ingredientsFontStyle || 'normal';
    ctx.font = `${ingredientsFontStyle} ${ingredientsFontWeight} ${ingredientsFontSize}px "${state.ingredientsFont}"`;
    ctx.fillStyle = state.ingredientsColor;
    ctx.textBaseline = 'top';

    const ingX = (state.ingredientsX / 100) * width;
    const ingY = (state.ingredientsY / 100) * height;
    
    const wrapPercent = state.ingredientsWidthPercent ?? 82;
    const manualWrapWidth = width * (wrapPercent / 100);
    const autoFit = state.ingredientsAutoFit ?? true;

    if (state.ingredientsWrap) {
      drawWrappedTextDynamic(
        ctx, 
        state.ingredientsText, 
        ingX, 
        ingY, 
        ingredientsLineHeight, 
        state.ingredientsAlign,
        width,
        height,
        template.shape,
        9,
        manualWrapWidth,
        autoFit
      );
    } else {
      ctx.textAlign = state.ingredientsAlign;
      const lines = state.ingredientsText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], ingX, ingY + i * ingredientsLineHeight);
      }
    }
  }

  // Restore clipping boundary
  ctx.restore();

  // 7. Draw Visual Cut-Line Boundary (Editor Preview ONLY, not printed)
  if (!forPrint) {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    if (template.shape === 'circular') {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 1, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (template.shape === 'oval') {
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, width / 2 - 1, height / 2 - 1, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (template.shape === 'rectangular' && template.id !== '5165' && template.id !== '8165') {
      const cornerRad = 0.09 * scaleDPI;
      drawRoundedRectPath(ctx, 1, 1, width - 2, height - 2, cornerRad);
      ctx.stroke();
    } else if (template.id !== '5165' && template.id !== '8165') {
      ctx.beginPath();
      ctx.rect(1, 1, width - 2, height - 2);
      ctx.stroke();
    }
    ctx.setLineDash([]); // reset

    // 7.5 Draw Visual Safety Zone Boundary (Editor Preview ONLY, not printed)
    if (state.showSafetyZone) {
      ctx.strokeStyle = '#10b981'; // emerald-500
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);

      const inset = 0.0625 * scaleDPI; // 0.0625 inches (1/16") inside label

      if (template.shape === 'circular') {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.max(0.1, width / 2 - inset), 0, 2 * Math.PI);
        ctx.stroke();
      } else if (template.shape === 'oval') {
        ctx.beginPath();
        ctx.ellipse(width / 2, height / 2, Math.max(0.1, width / 2 - inset), Math.max(0.1, height / 2 - inset), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (template.shape === 'rectangular' && template.id !== '5165' && template.id !== '8165') {
        const cornerRad = Math.max(0.01, 0.09 - 0.0625) * scaleDPI;
        drawRoundedRectPath(ctx, inset, inset, width - 2 * inset, height - 2 * inset, cornerRad);
        ctx.stroke();
      } else if (template.id !== '5165' && template.id !== '8165') {
        ctx.beginPath();
        ctx.rect(inset, inset, width - 2 * inset, height - 2 * inset);
        ctx.stroke();
      }
      ctx.setLineDash([]); // reset
    }
  }
}

export function drawSheet(
  ctx: CanvasRenderingContext2D,
  template: AveryTemplate,
  state: Omit<LabelState, 'viewMode'>,
  bgImageElement: HTMLImageElement | null
) {
  const pageWidth = ctx.canvas.width;  // page width (e.g. at 150 DPI)
  const pageHeight = ctx.canvas.height; // page height (e.g. at 150 DPI)

  // 1. Draw page background (clean white)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pageWidth, pageHeight);

  // 2. Generate a 300 DPI high-resolution temporary offscreen canvas stamp
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = template.width * 300;
  tempCanvas.height = template.height * 300;

  drawLabel(tempCtx, template, state, bgImageElement, true);

  // Scale margins and pitch values to visual canvas scale (e.g. 150 DPI)
  const dpiScale = pageWidth / 8.5; // should match visual DPI scale
  const leftMargin = template.leftMargin * dpiScale;
  const topMargin = template.topMargin * dpiScale;
  const pitchX = template.pitchX * dpiScale;
  const pitchY = template.pitchY * dpiScale;
  const w = template.width * dpiScale;
  const h = template.height * dpiScale;

  // 3. Loop over grid positions
  for (let r = 0; r < template.rows; r++) {
    for (let c = 0; c < template.cols; c++) {
      const x = leftMargin + c * pitchX;
      const y = topMargin + r * pitchY;

      // Stamp label
      ctx.drawImage(tempCanvas, x, y, w, h);

      // Visual border grid helper
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      if (template.shape === 'circular') {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w / 2, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (template.shape === 'oval') {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (template.shape === 'rectangular' && template.id !== '5165' && template.id !== '8165') {
        const cornerRad = 0.09 * dpiScale;
        drawRoundedRectPath(ctx, x, y, w, h, cornerRad);
        ctx.stroke();
      } else if (template.id !== '5165' && template.id !== '8165') {
        ctx.strokeRect(x, y, w, h);
      }
      ctx.setLineDash([]);

      // Visual safety margins inside grid preview
      if (state.showSafetyZone) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([1.5, 2.5]);
        const inset = 0.0625 * dpiScale;

        if (template.shape === 'circular') {
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, Math.max(0.1, w / 2 - inset), 0, 2 * Math.PI);
          ctx.stroke();
        } else if (template.shape === 'oval') {
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.1, w / 2 - inset), Math.max(0.1, h / 2 - inset), 0, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (template.shape === 'rectangular' && template.id !== '5165' && template.id !== '8165') {
          const cornerRad = Math.max(0.01, 0.09 - 0.0625) * dpiScale;
          drawRoundedRectPath(ctx, x + inset, y + inset, w - 2 * inset, h - 2 * inset, cornerRad);
          ctx.stroke();
        } else if (template.id !== '5165' && template.id !== '8165') {
          ctx.strokeRect(x + inset, y + inset, w - 2 * inset, h - 2 * inset);
        }
        ctx.setLineDash([]);
      }
    }
  }

  // Draw subtle sheet guidelines along paper page limits
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, pageWidth, pageHeight);
}
