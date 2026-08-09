/**
 * Tailwind for the AC7 GALEYR website.
 *
 * The design tokens live once, in tailwind.preset.js, so a colour or spacing
 * change lands everywhere rather than being typed twice and drifting.
 *
 * ── Why `import` and not `require` ────────────────────────────────────────
 * package.json declares "type": "module", so every .js file here is an ES
 * module and `require` is not defined. Tailwind's config loader papers over
 * that with jiti, which is why it appeared to work — but anything else that
 * reads this file directly fails, and the error names jiti rather than the
 * line at fault.
 *
 * ── What `content` has to cover ───────────────────────────────────────────
 * Both src/ and src/shared/. A class used only inside a shared component would
 * otherwise be purged from the stylesheet and render unstyled, with nothing in
 * the build to say why.
 */

import preset from './tailwind.preset.js';

export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}', './src/shared/**/*.{ts,tsx}'],
};
