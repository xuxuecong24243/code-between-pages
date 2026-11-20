<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

interface NoteInfo {
  categoryTitle: string
  categoryUrl: string
  bookTitle: string
  bookUrl: string
  chapterLabel: string
  chapterUrl: string
  published: string
  updated: string
  tags: string[]
}

const { frontmatter } = useData()
const note = computed<NoteInfo | undefined>(() =>
  frontmatter.value.learningNote ? frontmatter.value.noteInfo : undefined
)
</script>

<template>
  <div v-if="note" class="note-header">
    <nav class="note-breadcrumbs" aria-label="笔记位置">
      <span class="site-icon site-icon--book-2" aria-hidden="true"></span>
      <ol>
        <li><a :href="withBase('/notes/')">学习笔记</a></li>
        <li><a :href="withBase(note.categoryUrl)">{{ note.categoryTitle }}</a></li>
        <li><a :href="withBase(note.bookUrl)">{{ note.bookTitle }}</a></li>
        <li><a :href="withBase(note.chapterUrl)">{{ note.chapterLabel }}</a></li>
      </ol>
    </nav>
    <div class="note-dates">
      <span class="site-icon site-icon--calendar" aria-hidden="true"></span>
      <span>发布于 <time :datetime="note.published">{{ note.published }}</time></span>
      <span aria-hidden="true">·</span>
      <span>更新于 <time :datetime="note.updated">{{ note.updated }}</time></span>
    </div>
    <p v-if="note.tags.length" class="note-tags">标签：{{ note.tags.join(' · ') }}</p>
  </div>
</template>
