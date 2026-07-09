import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './style.css'

import HeroProfile from './components/HeroProfile.vue'

export default {
  ...DefaultTheme,

  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(HeroProfile)
    })
  }
}