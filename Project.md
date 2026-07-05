# Role & Objective
You are a Principal Frontend Engineer and UX Architect. Build a sleek, lightweight, single-file web application (`index.html`) called **"Avery Label Studio"**. The tool allows users to upload a base artwork image, enter product details (Title, Subtitle, Ingredients), visually adjust their positioning on a live preview canvas, select an official Avery label sheet format, and generate a print-ready 8.5" x 11" PDF.

# Absolute Technical Constraints (For Portability)
1. **Single-File Architecture:** All code (HTML, CSS, JavaScript) must reside inside one self-contained `index.html` file.
2. **Zero Setup / Client-Side Only:** No Node.js backend or local server installation can be required to run the app. Use public CDNs for libraries:
   - **Styling:** Tailwind CSS (via CDN script).
   - **Icons:** Lucide Icons or FontAwesome (via CDN).
   - **PDF Generation:** `jsPDF` (and `jsPDF-AutoTable` if needed, via CDN).
3. **Performance:** Lightweight, responsive, and immediate live rendering using the HTML5 `<canvas>` element.

---

## Core Functional Specifications

### 1. Avery Template Database (Built-in JSON Map)
Include a hardcoded JavaScript object containing accurate grid measurements (in inches) for common Avery sheets:
- **Avery 22807:** 2" Round Glossy (12/sheet | 3 cols x 4 rows | Top Margin: 0.875", Left Margin: 0.625", Pitch X: 2.375", Pitch Y: 2.375")
- **Avery 22817:** 2" Round Matte (Same layout as 22807)
- **Avery 22806:** 2" x 2" Square (12/sheet | 3 cols x 4 rows | Top Margin: 0.875", Left Margin: 0.625", Pitch X: 2.375", Pitch Y: 2.375")
- **Avery 5160:** 1" x 2.625" Address Labels (30/sheet | 3 cols x 10 rows | Top Margin: 0.5", Left Margin: 0.1875", Pitch X: 2.75", Pitch Y: 1.0")
- **Avery 22825:** 2" x 2" Round/Oval or similar popular cosmetic label.
*(Allow the user to select the active template from a clean dropdown selector).*

### 2. Left Sidebar: Data & Layout Controls
Divide the controls into organized accordion/collapsible sections or sleek tab cards:
- **Template Selection:** Dropdown of the Avery templates showing label dimensions and labels-per-sheet.
- **Base Background Image Uploader:**
  - File input allowing PNG/JPG/WEBP uploads.
  - Sliders for Image X Offset, Image Y Offset, and Image Scale (Zoom) so the user can center their uploaded logo/floral background perfectly within the label shape.
- **Text Layer Inputs & Positioning:**
  - **Product Title:** Input field, font selector (Serif, Sans-Serif, Script), font size slider, color picker, and X/Y offset sliders.
  - **Subtitle / Secondary Text:** Input field, font size, and X/Y offset sliders.
  - **Ingredients List:** Textarea input with auto-wrap toggle, font size slider, line-height adjustment slider, text alignment (Center/Left), and X/Y offset sliders.
- **Quick Reset & Presets:** A "Reset Positioning to Default" button that snaps the uploaded image and text blocks back to a balanced, centered default geometry based on the selected label shape.

### 3. Right Panel: Interactive Live Preview Studio
- Display a high-resolution HTML5 Canvas rendering a real-time preview of a **Single Label** at magnified scale.
- Visually indicate the boundary/cut-line of the label (e.g., a dashed circle for round labels or dashed rounded rectangle for square labels).
- Render the background image and text layers in real time as sliders are adjusted.
- Add a toggle button: **"Preview Full Sheet"** which switches the view to show all 12+ labels laid out on an 8.5" x 11" page grid.

### 4. PDF Generation Engine (`jsPDF`)
When the user clicks the prominent **"Export & Print PDF"** action button:
1. Initialize an 8.5" x 11" document at high resolution (300 DPI equivalent rendering).
2. Grab the active Avery template parameters (`left_margin`, `top_margin`, `horizontal_pitch`, `vertical_pitch`, `columns`, `rows`).
3. Loop through the rows and columns. At each calculated coordinate `(X, Y)`, stamp the exact composite canvas image (background + aligned text).
4. Auto-trigger a clean download modal saving the file as `[Product-Title]_Avery_[Template-ID].pdf`.

---

## UI/UX Design & Aesthetic Guidelines
- **Visual Vibe:** Modern, minimalist SaaS aesthetic (similar to Linear, Vercel, or Canva). Use subtle slate/zinc gray backgrounds (`bg-slate-900` or `bg-zinc-50`), high-contrast crisp text, and clean borders.
- **Layout:** Split-screen layout. Left side (35% width) scrollable control panel; Right side (65% width) centered, sticky preview stage with a subtle drop-shadow behind the label canvas.
- **Native Modals & Interactions:** Use clean browser native alerts/confirmations wrapped in custom UI polish where appropriate. Use native HTML range inputs styled with Tailwind accent colors for sliders (`accent-indigo-600`).
- **Feedback:** When exporting the PDF, show a sleek loading state on the button ("Rendering High-Res PDF...") to prevent double-clicks.

Ensure the final output is 100% bug-free, fully implemented within the single code block, and ready to be saved directly as `index.html`.