import { defineConfig } from 'vitepress'
import mathjax3 from 'markdown-it-mathjax3'

export default defineConfig({
  title: 'Code Between Pages',
  description: 'Notes, Research & Code',
  base: '/code-between-pages/',

  head: [
  [
    'script',
    {
      defer: '',
      src: 'https://cloud.umami.is/script.js',
      'data-website-id': '0d3328fa-f7de-46ce-a314-3b6ae9ed629e',
      'data-domains': 'xuxuecong24243.github.io'
    }
  ]
],
  
  markdown: {
    config(md) {
      md.use(mathjax3)
    }
  },

  themeConfig: {
  nav: [
    { text: "首页", link: "/" },
    { text: "Software", link: "/software/" },
    { text: "Research", link: "/research/" },
    { text: "Programming", link: "/programming/" },
    { text: "Notes", link: "/notes/" },
    { text: "AI", link: "/ai/" }
  ],
  
  outline: {
  level: [2, 3],
  label: 'On this page'
  },

  sidebar: {
    "/software/": [
      {
        text: "Software",
        items: [
          { text: "Overview", link: "/software/" },
          { text: "Visio Install", link: "/software/visio-install/" }
        ]
      }
    ],

    "/research/": [
      {
        text: "Research",
        items: [
          { text: "Overview", link: "/research/" },
          { text: "Scheduling", link: "/research/scheduling/" },
          { text: "Papers", link: "/research/papers/" }
        ]
      }
    ],

    "/programming/gurobi/": [
    {
      text: "Gurobi",
      items: [
        { text: "Overview", link: "/programming/gurobi/" },
        { text: "基本语法", link: "/programming/gurobi/basic-syntax" }
      ]
    }
  ],

  "/programming/": [
    {
      text: "Programming",
      items: [
        { text: "Overview", link: "/programming/" },
        { text: "Git", link: "/programming/git/" },
        { text: "Markdown", link: "/programming/markdown/" },
        { text: "VitePress", link: "/programming/vitepress/" },
        { text: "Gurobi", link: "/programming/gurobi/" }
      ]
    }
  ],

    "/notes/": [
      {
        text: "Notes",
        items: [
          { text: "Overview", link: "/notes/" }
        ]
      }
    ],

    "/ai/": [
      {
        text: "AI",
        items: [
          { text: "Overview", link: "/ai/" },
          { text: "ChatGPT", link: "/ai/chatgpt/" },
          { text: "Cursor", link: "/ai/cursor/" },
          { text: "Claude", link: "/ai/claude/" },
          { text: "Prompt", link: "/ai/prompt/" }
        ]
      }
    ]
  },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/xuxuecong24243/code-between-pages' }
    ]
  }
})