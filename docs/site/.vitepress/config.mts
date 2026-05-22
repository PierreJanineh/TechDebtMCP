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
