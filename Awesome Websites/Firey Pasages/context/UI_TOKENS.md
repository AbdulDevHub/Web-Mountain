<!--
  UI_TOKENS.md — Design tokens, color system, typography, and styling variables.
  Consult this document to ensure consistent visual aesthetics, spacing,
  and theming across components.
-->

# UI Design Tokens

## Color Palette

### Surfaces & Backgrounds
| Token | Value | Purpose |
|---|---|---|
| `--bg-primary` | `#080c16` | Main application backdrop base |
| `--bg-secondary` | `#0d1424` | Secondary background depth |
| `--bg-card` | `rgba(18, 25, 43, 0.65)` | Glassmorphic card surface |
| `--bg-card-hover` | `rgba(25, 35, 60, 0.75)` | Elevated card hover state |
| `--btn-bg` | `#131b2e` | Default control & button surface |
| `--btn-hover` | `#1e293b` | Button hover background |

### Borders & Overlays
| Token | Value | Purpose |
|---|---|---|
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Standard panel & card borders |
| `--border-glow` | `rgba(99, 102, 241, 0.35)` | Focus and active glow borders |
| `--btn-border` | `#293548` | Interactive control boundaries |

### Typography & Text
| Token | Value | Purpose |
|---|---|---|
| `--text-main` | `#f1f5f9` | Primary headings, story text, and labels |
| `--text-muted` | `#94a3b8` | Metadata, secondary text, status labels |
| `--text-dim` | `#64748b` | Footer, placeholders, disabled indicators |

### Accents & Gradients
| Token | Value | Purpose |
|---|---|---|
| `--accent-primary` | `#818cf8` | Primary interactive elements and links |
| `--accent-glow` | `#6366f1` | Button and slider shadows |
| `--accent-flame-1` | `#f97316` | Amber/Orange flame accent |
| `--accent-flame-2` | `#ec4899` | Pink/Rose flame accent |
| `--accent-flame-3` | `#a855f7` | Purple/Violet flame accent |

---

## Typography

- **Primary Font**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - Body copy, UI labels, panel titles, story text.
- **Monospace Font**: `'JetBrains Mono', monospace`
  - Time displays (`timeDisplay`), playback rate indicators, code previews in empty states.

---

## Border Radii

- `--radius-sm`: `0.375rem` (6px) — Small buttons, speed buttons
- `--radius-md`: `0.625rem` (10px) — Standard buttons, dropdown selects, badges
- `--radius-lg`: `0.875rem` (14px) — Visualizer canvas, toasts
- `--radius-xl`: `1.125rem` (18px) — Primary panels, gradient card, drop overlay

---

## Shadows & Glassmorphism

- **Glass Filter**: `backdrop-filter: blur(12px)` to `blur(16px)`
- **Panel Shadow**: `0 8px 32px rgba(0, 0, 0, 0.35)`
- **Primary Button Shadow**: `0 4px 12px rgba(99, 102, 241, 0.3)`
- **Toast Shadow**: `0 16px 40px rgba(0, 0, 0, 0.6)`
