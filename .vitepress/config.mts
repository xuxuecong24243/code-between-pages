import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Code Between Pages',
  description: 'Notes, Research & Code',

  base: '/code-between-pages/',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '软件', link: '/software/visio-install/' }
    ],

    sidebar: [
      {
        text: '软件',
        items: [
          { text: 'Visio 安装教程', link: '/software/visio-install/' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xuxuecong24243/code-between-pages' }
    ]
  }
})