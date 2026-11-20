<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

const { frontmatter } = useData()
const bookUrl = computed<string | undefined>(() =>
  frontmatter.value.learningNote ? frontmatter.value.noteInfo?.bookUrl : undefined
)
</script>

<template>
  <div v-if="bookUrl" class="note-return">
    <a :href="withBase(bookUrl)">
      <span class="site-icon site-icon--arrow-back-up" aria-hidden="true"></span>
      <span>返回书籍目录</span>
    </a>
  </div>
</template>
