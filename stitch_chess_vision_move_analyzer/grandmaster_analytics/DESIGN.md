---
name: Grandmaster Analytics
colors:
  surface: '#121416'
  surface-dim: '#121416'
  surface-bright: '#37393b'
  surface-container-lowest: '#0c0e10'
  surface-container-low: '#1a1c1e'
  surface-container: '#1e2022'
  surface-container-high: '#282a2c'
  surface-container-highest: '#333537'
  on-surface: '#e2e2e5'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e2e2e5'
  inverse-on-surface: '#2f3133'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#bcc7dd'
  on-secondary: '#263142'
  secondary-container: '#3c475a'
  on-secondary-container: '#aab6cc'
  tertiary: '#bfcdff'
  on-tertiary: '#082b72'
  tertiary-container: '#97b0ff'
  on-tertiary-container: '#254188'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#d8e3fa'
  secondary-fixed-dim: '#bcc7dd'
  on-secondary-fixed: '#111c2c'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#27438a'
  background: '#121416'
  on-background: '#e2e2e5'
  surface-variant: '#333537'
  deep-charcoal: '#121212'
  surface-gray: '#2D3748'
  win-green: '#81B64C'
  loss-red: '#E53E3E'
  analysis-blue: '#3182CE'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for the high-performance chess analyst. It evokes the atmosphere of a private study or a premier international tournament—quiet, focused, and intellectually rigorous. The aesthetic is a fusion of **Corporate Modern** and **Minimalism**, prioritizing information density and data clarity above all else.

The visual language communicates precision through sharp edges, a monochromatic foundation, and surgical use of gold for critical insights. The experience should feel like operating a high-end financial terminal: responsive, authoritative, and free from unnecessary distraction. 

Subtle geometric motifs, such as a 10% opacity checkered watermark or hairline grid patterns, should be used sparingly in large empty states to reinforce the chess-centric context without competing with active game data.

## Colors

The palette is strictly dark-mode by default to reduce eye strain during long analysis sessions. 

- **Primary (Grandmaster Gold):** Used exclusively for high-priority actions, "Best Move" indicators, and winning statuses. It represents the pinnacle of achievement.
- **Secondary (Slate Gray):** Used for secondary UI elements, borders, and inactive states.
- **Neutral (Deep Charcoal):** Provides the foundational depth. The background uses `#121212` for maximum contrast with text, while containers use `#1A1C1E`.
- **Semantic Colors:** Green and Red are reserved for move evaluation (blunders vs. brilliance), while a specific Analysis Blue is used for engine lines and theoretical paths.

## Typography

Typography in this design system is built for legibility and technical precision.

- **Hanken Grotesk** serves as the primary typeface. It offers a sharp, contemporary feel that remains readable at small sizes in dense data tables.
- **JetBrains Mono** is introduced for move notation (e.g., `1. e4 e5 2. Nf3`), coordinate systems, and engine evaluation numbers. The monospaced nature ensures that columns of moves align perfectly for easy scanning.
- **Visual Hierarchy:** Use `headline-xl` sparingly for major dashboard titles. Most interface labels should utilize `label-sm` with slight letter spacing to maintain a clean, architectural look.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for desktop analysis tools to ensure the chess board remains the focal point at a consistent aspect ratio.

- **Grid Model:** 12-column grid for dashboard views. On analysis screens, a custom 3-pane layout is preferred: Left (Engine/Stats), Center (Board), Right (Move History/Notation).
- **Density:** High density is encouraged. Padding within data cells and move lists should be tight (8px) to maximize the visible move history without scrolling.
- **Breakpoints:**
    - **Desktop (1280px+):** Full 3-pane view.
    - **Tablet (768px - 1279px):** Board takes precedence; engine and notation move to a tabbed interface or vertical stack.
    - **Mobile (<767px):** Board occupies the top half of the viewport; notation scroll-area occupies the bottom half.

## Elevation & Depth

To maintain a sophisticated, flat-dashboard aesthetic, this design system avoids heavy shadows. Depth is achieved through **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Levels:** 
    - Level 0: Background (`#121212`)
    - Level 1: Main Containers (`#1A1C1E`)
    - Level 2: Popovers/Tooltips (`#2D3748`)
- **Outlines:** Use 1px borders in `#4A5568` (Slate) to define regions. In active or "focused" states, these borders may transition to the Primary Gold.
- **Interaction:** Hover states should utilize a subtle background light-up (increasing lightness by 5%) rather than an elevation lift.

## Shapes

The shape language is **Soft (0.25rem)**. This provides just enough curvature to feel modern and premium while maintaining the "sharp" and "precise" requirement of an analytical tool.

- **Standard Elements:** Buttons, input fields, and move chips use a 4px (0.25rem) radius.
- **Large Containers:** Dashboard cards and the main chess board wrapper use 8px (0.5rem) to distinguish them from smaller UI components.
- **Special Case:** Game status indicators (e.g., "Live") may use a pill-shape to contrast against the otherwise rectangular grid.

## Components

- **Buttons:**
    - *Primary:* Solid Gold (`#D4AF37`) with black text. Sharp, high-contrast.
    - *Secondary:* Ghost style with a Slate border and white text.
- **Move Chips:** Small, rectangular containers for chess notation. Use JetBrains Mono. Successful moves (verified by engine) get a subtle green left-border; blunders get a red left-border.
- **Chess Board:** The "Light" squares should be a very desaturated slate (`#CBD5E0`), and "Dark" squares should be the secondary color (`#4A5568`). No textures; flat matte finish only.
- **Input Fields:** Dark background (`#121212`) with a subtle 1px border. Focus state changes border to Gold.
- **Analysis Cards:** Use Level 1 surface color. Headers should have a thin bottom-border to separate them from content. No drop shadows; use color differentiation to define the boundary.
- **Evaluation Bar:** A vertical bar next to the board. White for advantage, Black for disadvantage. The center-line should be marked with a 1px Gold hairline.