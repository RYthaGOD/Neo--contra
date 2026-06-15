// Auto-detects any backdrop images placed in src/assets/bg/ at build time, so
// only files that actually exist are loaded (no 404s, no manifest to maintain).
// Drop e.g. level1.png / title.png / boss1.png — see docs/ASSET_PROMPTS.md.

const modules = import.meta.glob('../assets/bg/*.{png,jpg,jpeg,webp}', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>;

// Map "bg_<name>" -> resolved URL, e.g. "bg_level1", "bg_title", "bg_boss3".
export const BG_URLS: Record<string, string> = {};
for (const path in modules) {
    const file = path.split('/').pop() || '';
    const name = file.replace(/\.(png|jpe?g|webp)$/i, '');
    if (name) BG_URLS['bg_' + name] = modules[path];
}

export const hasBackdrop = (key: string) => key in BG_URLS;
