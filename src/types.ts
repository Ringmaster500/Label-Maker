export interface AveryTemplate {
  id: string;
  name: string;
  description: string;
  material: string;
  width: number; // in inches
  height: number; // in inches
  shape: 'circular' | 'square' | 'rectangular' | 'oval';
  cols: number;
  rows: number;
  leftMargin: number; // in inches
  topMargin: number; // in inches
  pitchX: number; // in inches
  pitchY: number; // in inches
}

export interface LabelState {
  templateId: string;
  bgColor: string;
  bgImageDataURL: string | null; // dataURL or backend secure R2 URL
  bgScale: number; // 10 to 300
  bgX: number; // -50 to 150
  bgY: number; // -50 to 150
  titleEnabled: boolean;
  titleText: string;
  titleFont: string;
  titleSize: number;
  titleColor: string;
  titleX: number;
  titleY: number;
  titleFontWeight: 'normal' | 'bold';
  subtitleEnabled: boolean;
  subtitleText: string;
  subtitleFont: string;
  subtitleSize: number;
  subtitleColor: string;
  subtitleX: number;
  subtitleY: number;
  ingredientsEnabled: boolean;
  ingredientsText: string;
  ingredientsFont: string;
  ingredientsSize: number;
  ingredientsColor: string;
  ingredientsX: number;
  ingredientsY: number;
  ingredientsAlign: 'left' | 'center' | 'right';
  ingredientsWrap: boolean;
  ingredientsLineHeight: number;
  showSafetyZone: boolean;
  isTemplateBaseMode: boolean;
  activeBaseName: string;
  viewMode: 'single' | 'sheet';
  titleFontStyle?: 'normal' | 'italic';
  subtitleFontWeight?: 'normal' | 'bold';
  subtitleFontStyle?: 'normal' | 'italic';
  ingredientsFontWeight?: 'normal' | 'bold';
  ingredientsFontStyle?: 'normal' | 'italic';
  titleAccentType?: 'none' | 'sideLines' | 'divider';
  titleAccentStyle?: 'angledDown' | 'angledUp' | 'straight' | 'solid' | 'dashed' | 'double' | 'pizazz';
  titleAccentSeverity?: 'mild' | 'normal' | 'steep';
  subtitleAccentType?: 'none' | 'divider';
  subtitleAccentStyle?: 'solid' | 'dashed' | 'double' | 'pizazz';
  detailsSideLinesEnabled?: boolean;
  detailsSideLinesStyle?: 'angledDown' | 'angledUp' | 'straight';
  detailsSideLinesAlign?: 'top' | 'middle' | 'bottom';
  detailsSideLinesSeverity?: 'mild' | 'normal' | 'steep';
  detailsDividerEnabled?: boolean;
  detailsDividerStyle?: 'solid' | 'dashed' | 'double' | 'pizazz';
  detailsOrnamentEnabled?: boolean;
  detailsOrnamentStyle?: 'star' | 'dot' | 'flankingDots' | 'bottomFlourish';
  borderEnabled?: boolean;
  borderStyle?: 'thin' | 'double' | 'dashed' | 'thick' | 'doubleRing' | 'softRing' | 'corners';
  accentColor?: string;
  accentWeight?: 'thin' | 'medium' | 'thick';
  ingredientsWidthPercent?: number;
  ingredientsAutoFit?: boolean;
}

export interface SavedDesign {
  id: string;
  name: string;
  isTemplateBase: boolean;
  templateId: string;
  state: Omit<LabelState, 'viewMode' | 'showSafetyZone'>;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  email: string;
  token: string;
}
