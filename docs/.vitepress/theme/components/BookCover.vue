<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{ title: string; href: string; src?: string }>()
const image = ref<HTMLImageElement>()
const loaded = ref(false)
const failed = ref(false)

watch(() => props.src, () => {
  loaded.value = false
  failed.value = false
})

// Cached images may finish loading before Vue attaches the event handlers.
onMounted(() => {
  if (image.value?.complete) {
    loaded.value = image.value.naturalWidth > 0
    failed.value = !loaded.value
  }
})
</script>

<template>
  <a class="notes-book-cover" :href="withBase(href)" :aria-label="`阅读《${title}》学习笔记`">
    <span v-if="!loaded || failed" class="notes-book-cover-placeholder" aria-hidden="true">
      <span class="site-icon site-icon--book-2 notes-book-icon"></span>
    </span>
    <img
      v-if="src && !failed"
      :key="src"
      ref="image"
      :src="withBase(src)"
      :alt="`《${title}》书籍封面`"
      :class="{ 'is-loaded': loaded }"
      width="112"
      height="156"
      loading="lazy"
      decoding="async"
      @load="loaded = true"
      @error="failed = true"
    >
  </a>
</template>
