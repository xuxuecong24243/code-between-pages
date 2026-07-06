import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Code Between Pages',
  description: 'Notes, Research & Code',

  base: '/code-between-pages/',

  themeConfig: {
  nav: [
    { text: "首页", link: "/" },
    { text: "Software", link: "/software/" },
    { text: "Research", link: "/research/" },
    { text: "Programming", link: "/programming/" },
    { text: "Notes", link: "/notes/" },
    { text: "AI", link: "/ai/" }
  ],

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

    "/programming/": [
      {
        text: "Programming",
        items: [
          { text: "Overview", link: "/programming/" },
          { text: "Git", link: "/programming/git/" },
          { text: "Markdown", link: "/programming/markdown/" },
          { text: "VitePress", link: "/programming/vitepress/" }
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