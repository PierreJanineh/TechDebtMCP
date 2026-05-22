import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Tech Debt MCP',
  description:
    'MCP server for static technical-debt analysis across 14 languages — tools, custom rules, and dependency scanning for Claude Code, Copilot, and other MCP clients.',
  base: '/TechDebtMCP/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/TechDebtMCP/icon.png' }],
    ['meta', { name: 'theme-color', content: '#4b5563' }],
    // Plausible analytics — self-hosted at plausible.pierrejanineh.com.
    // Cookieless, no PII, no fingerprinting. data-domain matches the
    // GitHub Pages hostname so events are scoped to this site.
    //
    // The script filename encodes the optional measurements enabled in
    // the Plausible site settings. Currently: outbound-links. Adding 404
    // or other toggles requires both flipping them in Plausible UI and
    // updating the src filename here (Plausible only serves variants
    // whose toggles are on; mismatches 404 on the script load).
    [
      'script',
      {
        defer: '',
        'data-domain': 'pierrejanineh.github.io',
        src: 'https://plausible.pierrejanineh.com/js/script.outbound-links.js',
      },
    ],
    // Bootstrap helper required by the "404 error pages" measurement.
    // Plausible doesn't detect 404s client-side automatically — the site
    // has to call plausible('404', { props: { path } }) when it renders
    // a missing page. The actual firing happens in the theme's enhanceApp
    // (see .vitepress/theme/index.ts). This shim buffers calls until the
    // deferred tracker script is loaded, so the firing code works even if
    // it runs before the main script attaches plausible().
    [
      'script',
      {},
      'window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }',
    ],
  ],
  themeConfig: {
    nav: [
      { text: 'Install', link: '/install' },
      { text: 'Tools', link: '/tools/' },
      { text: 'Custom Rules', link: '/custom-rules' },
      { text: 'Security', link: '/security' },
      {
        text: 'More',
        items: [
          { text: 'Language Coverage', link: '/languages' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Roadmap', link: '/roadmap' },
          { text: 'Changelog', link: '/changelog' },
        ],
      },
    ],
    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/' },
            { text: 'Install', link: '/install' },
            { text: 'Language Coverage', link: '/languages' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'Tool Reference', link: '/tools/' },
            { text: 'Custom Rules', link: '/custom-rules' },
            { text: 'Security Model', link: '/security' },
          ],
        },
        {
          text: 'Project',
          items: [
            { text: 'Architecture', link: '/architecture' },
            { text: 'Roadmap', link: '/roadmap' },
            { text: 'Changelog', link: '/changelog' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/PierreJanineh/TechDebtMCP' }],
    editLink: {
      pattern:
        'https://github.com/PierreJanineh/TechDebtMCP/edit/develop/docs/site/:path',
      text: 'Edit this page on GitHub',
    },
    search: { provider: 'local' },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Pierre Janineh',
    },
  },
});
