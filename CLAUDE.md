# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Serve dist/ locally (use after build to test static pages)
npm run lint     # ESLint
```

There are no tests. The app runs entirely in the browser — all conversion logic can be verified by loading the dev server and uploading a file.

Local blog routing (`/blog/`, `/blog/pt/`, etc.) is handled by a custom Vite plugin in `vite.config.js` that serves `public/<path>/index.html` for bare directory URLs. Netlify handles this natively in production.

## Architecture

This is a React 19 + Vite 8 single-page application. The React app (`src/`) handles the converter UI. Static HTML files in `public/` serve blog articles and the privacy policy — no React Router involved.

### Conversion pipeline

**XML → OFX** (`src/converter.js`):
- Strips `xmlns` attributes before parsing so `querySelector` works without namespace handling (required for ISO 20022 camt.053 files from Wise/SEPA banks)
- Tries a list of known transaction node names: `STMTTRN`, `Ntry` (camt.053), `transaction`, `entry`, etc.
- Maps both generic OFX field names and camt.053 field names (`CdtDbtInd`, `Amt`, `BookgDt`, `AddtlNtryInf`, etc.)

**PDF → OFX** (`src/pdfConverter.js`):
- Uses `pdfjs-dist` for text extraction; groups items by y-coordinate to reconstruct visual lines
- Primary algorithm targets the Wise PDF layout: description + amounts appear on one y-coordinate (same "line"), date appears on the next line below. For each date line, it looks **backward** up to 4 lines to find amounts; the **second-to-last** amount is the transaction amount (last = running balance)
- Falls back to looking forward (next line) for formats where amounts follow the date

**State machine** (`src/App.jsx`):
Steps: `IDLE → FILE_LOADED → CONVERTING → DONE | ERROR`. Supports XML and PDF. All conversion is browser-side; nothing is uploaded.

### Internationalization

`src/translations.js` exports `{ en: {...}, pt: {...} }`. Language preference is stored in `localStorage` as `lang`. The React app reads/writes it. Blog pages (static HTML) also read/write `localStorage.lang` via inline `onclick` handlers.

### Dark/light theme

Theme preference stored in `localStorage` as `theme` (`'dark'` | `'light'`; defaults to `'dark'`).

- **React app**: `useEffect` toggles `document.documentElement.classList` between `dark`/light. Tailwind v4 uses `@custom-variant dark (&:where(.dark, .dark *))` in `src/index.css` to enable class-based dark mode. A no-flash init script in `index.html` applies the class before React hydrates.
- **Static pages**: Each blog/privacy HTML file has the same no-flash init script in `<head>` and toggles `document.documentElement.classList.dark` via inline `onclick`.

### Static pages (`public/`)

Blog articles and privacy policy are standalone HTML files with inline `<style>` — no build step, no framework. They share a common header structure:
- Logo + "OFX Converter" link
- `<div class="header-links">`: Blog link · EN/PT toggle (`class="lang-btn"`) · theme toggle (`class="theme-btn"`)

When adding a new blog article: create both EN and PT versions, add hreflang `<link>` tags in each, add `onclick="localStorage.setItem('lang','...')"` to the language toggle link, add the no-flash theme init script, add the theme toggle button HTML, and update `public/sitemap.xml`.

### Deployment

Deployed on Netlify (auto-deploy from `master` branch of `github.com/luislufttech/ofx-converter`). Build config is in `netlify.toml`. The live URL is `https://ofx-converter.netlify.app/`.
