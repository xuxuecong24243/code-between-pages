import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import './notes.css'
import './icons.css'

import HeroProfile from './components/HeroProfile.vue'
import NoteHeader from './components/NoteHeader.vue'
import NoteReturn from './components/NoteReturn.vue'
import BookCover from './components/BookCover.vue'
import type { Theme } from 'vitepress'

export default {
  ...DefaultTheme,

  enhanceApp({ app }) {
    app.component('BookCover', BookCover)
  },

  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(HeroProfile),
      'nav-bar-title-before': () => h('span', { class: 'site-icon site-mark', 'aria-hidden': 'true' }),
      'doc-before': () => h(NoteHeader),
      'doc-after': () => h(NoteReturn)
    })
  }
} satisfies Theme
