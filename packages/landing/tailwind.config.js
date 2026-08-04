/**
 * Tailwind for the landing package.
 *
 * The design tokens live once, in shared/tailwind.preset.js, so a colour or
 * spacing change lands in both the website and the app without being typed
 * twice and drifting.
 *
 * `content` scans this package AND the shared components, because a class
 * used only inside a shared component would otherwise be purged from this
 * package's stylesheet and silently render unstyled.
 */
export default {
  presets: [require('../shared/tailwind.preset.js')],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../shared/src/**/*.{ts,tsx}'],
};
