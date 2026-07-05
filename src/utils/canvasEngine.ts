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

  // 4. Render Product Title Layer
  if (state.titleEnabled && state.titleText.trim() !== '') {
    const titleFontSize = state.titleSize * (scaleDPI / 72);
    ctx.font = `${state.titleFontWeight} ${titleFontSize}px "${state.titleFont}"`;
    ctx.fillStyle = state.titleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.titleText, (state.titleX / 100) * width, (state.titleY / 100) * height);
  }

  // 5. Render Subtitle Layer
  if (state.subtitleEnabled && state.subtitleText.trim() !== '') {
    const subtitleFontSize = state.subtitleSize * (scaleDPI / 72);
    ctx.font = `normal ${subtitleFontSize}px "${state.subtitleFont}"`;
    ctx.fillStyle = state.subtitleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.subtitleText, (state.subtitleX / 100) * width, (state.subtitleY / 100) * height);
  }

  // 6. Render Ingredients / Details Layer
  if (state.ingredientsEnabled && state.ingredientsText.trim() !== '') {
    const ingredientsFontSize = state.ingredientsSize * (scaleDPI / 72);
    const ingredientsLineHeight = ingredientsFontSize * state.ingredientsLineHeight;
    ctx.font = `normal ${ingredientsFontSize}px "${state.ingredientsFont}"`;
    ctx.fillStyle = state.ingredientsColor;
    ctx.textBaseline = 'top';

    const ingX = (state.ingredientsX / 100) * width;
    const ingY = (state.ingredientsY / 100) * height;
    const maxWrapWidth = width * 0.82; // 9% margins inside label

    if (state.ingredientsWrap) {
      drawWrappedText(ctx, state.ingredientsText, ingX, ingY, maxWrapWidth, ingredientsLineHeight, state.ingredientsAlign);
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
