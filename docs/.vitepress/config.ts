import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/ez-modal/',
  title: 'EZModal',
  description: 'Vue 3 通用弹窗组件文档',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '使用指南', link: '/guide/getting-started' },
      { text: 'API', link: '/guide/api' }
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: 'API', link: '/guide/api' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ccwq/ez-modal' }
    ]
  }
})
