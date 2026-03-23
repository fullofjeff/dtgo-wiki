# Design Tokens

Source of truth: `src/index.css`

## Color Palette

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--jf-gold` | `#d8830a` | Active states, accent highlights, brand identity |
| `--jf-cream` | `#ebe7c7` | Heading text, stat values, emphasis |
| `--jf-lavender` | `#c9cfe9` | Links, code text, interactive accents, focus rings |

### Entity Accent Colors

| Token | Value | Entity |
|-------|-------|--------|
| `--dtgo-green` | `#22c997` | DTGO Corporation |
| `--mqdc-blue` | `#4f8cff` | MQDC |
| `--tnb-orange` | `#f5a623` | T&B Media Global |
| `--dtp-pink` | `#e84393` | DTP |

## Surface System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-body` | `#191918` | Page background |
| `--bg-surface` | `#191918` | Card/container background (same as body) |
| `--bg-surface-inset` | `#141413` | Recessed areas, table headers, code blocks, form inputs |
| `--bg-input` | `#141413` | Form input backgrounds |

## Text System

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#f8f3e8` | Headings, primary content, strong text |
| `--text-secondary` | `rgba(248,243,232,0.5)` | Body text, descriptions, labels |
| `--text-placeholder` | `rgba(248,243,232,0.25)` | Input placeholders |

## Border System

| Token | Value | Usage |
|-------|-------|-------|
| `--border-default` | `#151515` | Structural borders, card edges, section dividers |
| `--border-subtle` | `rgba(255,255,255,0.05)` | Faint dividers, separator lines |
| `--border-hover` | `rgba(255,255,255,0.08)` | Hover state borders |

## Shadow System

| Token | Value |
|-------|-------|
| `--card-shadow` | `0 6px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 2px rgba(0,0,0,0.6)` |
| `--card-shadow-hover` | `0 8px 24px rgba(0,0,0,0.5)` |

## Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-serif` | `'EB Garamond', 'Georgia', serif` | Headings (h1, h2), stat values, hero text |
| `--font-sans` | `'Avenir', -apple-system, BlinkMacSystemFont, sans-serif` | Body text, UI elements (default) |
| `--font-mono` | `'SF Mono', Monaco, monospace` | Code, technical values |

### Typography Scale (from prose classes)

| Element | Size | Weight | Font | Color |
|---------|------|--------|------|-------|
| h1 | `2rem` | 600 | serif | `--jf-cream` |
| h2 | `1.4rem` | 600 | serif | `--jf-cream` |
| h3 | `1.1rem` | 600 | sans | `--text-primary` |
| Body text | `14px` | 300 | sans | `--text-secondary` |
| Strong | inherit | 500 | inherit | `--text-primary` |
| Code inline | `0.82em` | inherit | mono | `--jf-lavender` |
| Labels | `0.65rem` | 500-600 | sans | `--text-secondary` |
| Stat values | `1.75rem` | 600 | serif | `--jf-cream` |

### Label Convention

Section headers and stat labels use this pattern:
```css
font-size: 0.65rem;
text-transform: uppercase;
letter-spacing: 1.5px;
font-weight: 500;
color: var(--text-secondary);
```

## Radius & Z-Index

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-card` | `14px` | Cards, containers |
| `--radius-input` | `10px` | Inputs, search boxes |
| `--z-sidebar` | `5` | Sidebar overlay |
| `--z-dropdown` | `100` | Dropdowns, tooltips |
| `--z-modal` | `2000` | Modal dialogs |

## Pre-Built CSS Utility Classes

These classes are defined in `src/index.css` and ready to use:

| Class | Purpose |
|-------|---------|
| `.wiki-card` | Standard card (surface bg, border, shadow, transition) |
| `.wiki-card-clickable` | Adds cursor pointer + hover brightness/translate |
| `.stat-card` | Stat display card (centered, padded) |
| `.stat-value` | Large serif number display |
| `.stat-label` | Uppercase label below stat |
| `.accent-top` | 3px border-top accent stripe (set `borderColor` via style) |
| `.badge-mqdc` | MQDC entity badge |
| `.badge-tnb` | T&B entity badge |
| `.badge-dtp` | DTP entity badge |
| `.badge-dtgo` | DTGO entity badge |
| `.badge-default` | Neutral badge |
| `.search-input` | Styled search input |
| `.search-dropdown` | Search results dropdown |
| `.search-result` | Individual search result row |
| `.prose` | Markdown prose container (h1-h3, p, code, a, ul, ol, table, hr) |
| `.org-node` | Org chart node card |

## Token Mapping: dtgo-wiki vs JF_DASHBOARD

When adapting components from JF_DASHBOARD, remap these tokens:

| JF_DASHBOARD Token | dtgo-wiki Token | Notes |
|--------------------|-----------------|-------|
| `--jf-dark-bg` | `--bg-body` | Different names, similar values |
| `--jf-bg-body` | `--bg-body` | |
| `--jf-bg-surface` | `--bg-surface` | |
| `--jf-text-primary` | `--text-primary` | Slightly different values (#ebe7c7 vs #f8f3e8) |
| `--pwv-lavender` | `--jf-lavender` | Different shades (#ccccff vs #c9cfe9) |
| `--pwv-red` | — | No direct equivalent, inline or add |
| `--pwv-green` | `--dtgo-green` | Close enough for success states |
| `--pwv-amber` | `--tnb-orange` | Close enough for warning states |
| `--jf-gold` | `--jf-gold` | Same token name |
| `--jf-cream` | `--jf-cream` | Same token name |
| `--jf-lavender` | `--jf-lavender` | Same token name |
