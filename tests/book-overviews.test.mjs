import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'
import { createMarkdownRenderer } from 'vitepress'
import mathjax3 from 'markdown-it-mathjax3'
import { loadNotes, buildNotePages } from '../docs/.vitepress/notes/catalog.mjs'
import { safeNotesMarkdown } from '../docs/.vitepress/notes/security.mjs'

const catalog = {
  categories: [{ slug: 'llm', title: '大语言模型' }],
  books: [{ slug: 'rag-practice', category: 'llm', title: 'RAG 学习书籍' }]
}
const overviewMetadata = {
  title: '《RAG 学习书籍》学习笔记', category: 'llm', book: 'rag-practice',
  published: '2026-11-22', status: 'in-progress', draft: false
}
const articleMetadata = {
  ...overviewMetadata, title: '实际学习问题', slug: 'learning-questions', chapter: 2
}

function fixture(t, bookCatalog = catalog) {
  const root = mkdtempSync(path.join(tmpdir(), 'blog-book-overviews-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(path.join(root, 'catalog.json'), JSON.stringify(bookCatalog), 'utf8')
  return root
}

function writeSource(root, filename, metadata, body = '# 学习记录\n\n记录我的真实疑问。\n') {
  const file = path.join(root, filename)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `---\n${stringify(metadata)}---\n${body}`, 'utf8')
  return file
}

function overview(root, metadata = overviewMetadata, body) {
  return writeSource(root, 'llm/rag-practice/index.md', metadata, body)
}

function metadata(page) {
  return parse(page.content.match(/^---\n([\s\S]*?)\n---/)[1])
}

function bookPage(pages) {
  return pages.find(page => page.params.page === 'llm/rag-practice/index')
}

test('a published index.md makes a book visible with zero articles and no duplicate home', t => {
  const root = fixture(t)
  overview(root)
  const loaded = loadNotes(root)
  assert.equal(loaded.notes.length, 0)
  assert.equal(loaded.published.length, 0)
  const pages = buildNotePages(root)
  assert.deepEqual(pages.map(page => page.params.page), ['index', 'llm/index', 'llm/rag-practice/index'])
  assert.equal(metadata(bookPage(pages)).title, overviewMetadata.title)
  assert.match(bookPage(pages).content, /记录我的真实疑问/)
  assert.match(bookPage(pages).content, /0 篇/)
  assert.match(bookPage(pages).content, /待更新/)
  assert.match(pages[0].content, /\/notes\/llm\/rag-practice\//)
  assert.doesNotMatch(JSON.stringify(pages), /undefined|NaN|index\.html/)
})

test('new article files populate the directory and pager without counting the overview', t => {
  const root = fixture(t)
  overview(root)
  writeSource(root, 'llm/rag-practice/second.md', articleMetadata)
  let pages = buildNotePages(root)
  assert.match(bookPage(pages).content, /1 篇/)
  const only = metadata(pages.find(page => page.params.page.endsWith('/learning-questions')))
  assert.equal(only.prev, false)
  assert.equal(only.next, false)

  writeSource(root, 'llm/rag-practice/first.md', {
    ...articleMetadata, title: '较早章节的疑问', slug: 'earlier-questions', chapter: 1
  })
  writeSource(root, 'llm/rag-practice/topic.md', {
    ...articleMetadata, title: '独立专题', slug: 'topic-questions', chapter: undefined
  })
  pages = buildNotePages(root)
  assert.equal(loadNotes(root).published.length, 3)
  assert.match(bookPage(pages).content, /3 篇/)
  const articles = pages.filter(page => metadata(page).noteInfo)
  assert.deepEqual(articles.map(page => page.params.page), [
    'llm/rag-practice/earlier-questions', 'llm/rag-practice/learning-questions', 'llm/rag-practice/topic-questions'
  ])
  assert.equal(metadata(articles[0]).prev, false)
  assert.equal(metadata(articles[0]).next.link, '/notes/llm/rag-practice/learning-questions.html')
  assert.equal(metadata(articles[1]).prev.link, '/notes/llm/rag-practice/earlier-questions.html')
  assert.equal(metadata(articles[1]).next.link, '/notes/llm/rag-practice/topic-questions.html')
  assert.equal(metadata(articles[2]).next, false)
  for (const page of articles) assert.doesNotMatch(JSON.stringify(metadata(page).prev), /index|\/rag-practice\/"/)
})

test('a draft-only overview creates no public category or book and leaks no content', t => {
  const root = fixture(t)
  overview(root, { ...overviewMetadata, title: 'PRIVATE_OVERVIEW_TITLE', draft: true }, '# PRIVATE_OVERVIEW_BODY')
  const pages = buildNotePages(root)
  assert.deepEqual(pages.map(page => page.params.page), ['index'])
  assert.doesNotMatch(JSON.stringify(pages), /PRIVATE_OVERVIEW|rag-practice/)
})

test('progress and latest update include published articles but exclude completed drafts', t => {
  const root = fixture(t)
  overview(root, { ...overviewMetadata, updated: '2026-11-23' })
  writeSource(root, 'llm/rag-practice/completed.md', {
    ...articleMetadata, status: 'completed', updated: '2026-11-24'
  })
  writeSource(root, 'llm/rag-practice/in-progress.md', {
    ...articleMetadata, slug: 'still-learning', chapter: 3
  })
  writeSource(root, 'llm/rag-practice/draft.md', {
    ...articleMetadata, slug: 'draft-completed', status: 'completed', draft: true, updated: '2026-11-25'
  })
  const pages = buildNotePages(root)
  assert.match(bookPage(pages).content, /已发布 2 篇笔记/)
  assert.match(bookPage(pages).content, /已完成 1 篇笔记/)
  for (const route of ['index', 'llm/index', 'llm/rag-practice/index']) {
    assert.match(pages.find(page => page.params.page === route).content, /最近更新 2026-11-24/)
  }
  assert.doesNotMatch(JSON.stringify(pages), /2026-11-25|draft-completed/)
})

test('published articles keep their generated book directory while its overview is a draft', t => {
  const root = fixture(t)
  overview(root, { ...overviewMetadata, title: 'PRIVATE_OVERVIEW_TITLE', draft: true }, '# PRIVATE_OVERVIEW_BODY')
  writeSource(root, 'llm/rag-practice/questions.md', articleMetadata)
  const pages = buildNotePages(root)
  assert.equal(metadata(bookPage(pages)).title, catalog.books[0].title)
  assert.match(bookPage(pages).content, /learning-questions\.html/)
  assert.doesNotMatch(JSON.stringify(pages), /PRIVATE_OVERVIEW/)
})

test('a second book with an overview leaves existing book routes and pager unchanged', t => {
  const root = fixture(t, {
    ...catalog,
    books: [...catalog.books, { slug: 'existing-book', category: 'llm', title: '已有书籍' }]
  })
  writeSource(root, 'llm/existing-book/questions.md', { ...articleMetadata, book: 'existing-book' })
  const before = buildNotePages(root).filter(page => page.params.page.startsWith('llm/existing-book/'))
  overview(root)
  const after = buildNotePages(root).filter(page => page.params.page.startsWith('llm/existing-book/'))
  assert.deepEqual(after, before)
})

test('two source index files cannot claim the same book, including a draft copy', t => {
  const root = fixture(t)
  overview(root)
  writeSource(root, 'duplicate/index.md', { ...overviewMetadata, draft: true })
  assert.throws(() => loadNotes(root), /duplicate.*(?:overview|home|index)/i)
})

for (const [field, value] of [['slug', 'overview'], ['chapter', 1], ['chapterTitle', '占位章节'], ['order', 0]]) {
  test(`a book overview rejects article-only field ${field}`, t => {
    const root = fixture(t)
    overview(root, { ...overviewMetadata, [field]: value })
    assert.throws(() => loadNotes(root), error => /index\.md/.test(error.message) && error.message.includes(field))
  })
}

test('an overview still validates required metadata and unsafe author directives', t => {
  const root = fixture(t)
  for (const field of ['title', 'category', 'book', 'published']) {
    const incomplete = { ...overviewMetadata }
    delete incomplete[field]
    overview(root, incomplete)
    assert.throws(() => loadNotes(root), error => /index\.md/.test(error.message) && error.message.includes(field))
  }
  overview(root, overviewMetadata, '<!-- @include: ../../secret -->')
  assert.throws(() => loadNotes(root), /include/)
})

const renderer = await createMarkdownRenderer(fileURLToPath(new URL('../docs/', import.meta.url)), {
  config(md) {
    md.use(mathjax3)
    md.use(safeNotesMarkdown)
  }
}, '/code-between-pages/')

function render(page) {
  return renderer.render(page.content, { path: 'notes/test.md', relativePath: 'notes/test.md' })
}

test('an authored overview renders safely while generated chapter and topic anchors work', t => {
  const root = fixture(t)
  overview(root, overviewMetadata, [
    '# 书籍学习首页',
    '<script>alert(1)</script>',
    '<img src=x onerror="alert(1)">',
    '{{ constructor.constructor("alert(1)")() }}',
    '## 我的疑问 {onclick="alert(1)"}',
    '[unsafe](javascript:alert%281%29)'
  ].join('\n\n'))
  writeSource(root, 'llm/rag-practice/chapter.md', articleMetadata)
  writeSource(root, 'llm/rag-practice/topic.md', { ...articleMetadata, slug: 'topic-questions', chapter: undefined })
  const pages = buildNotePages(root)
  const html = render(bookPage(pages))
  assert.match(html, /v-pre/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script|<img|<[^>]+\son(?:click|error)=|href="javascript:/)
  assert.match(html, /id="chapter-2"/)
  assert.match(html, /href="#chapter-2"/)
  assert.match(html, /id="topics"/)
  assert.match(html, /href="#topics"/)
  assert.doesNotMatch(html, /\{#(?:chapter-2|topics)\}/)
  for (const article of pages.filter(page => metadata(page).noteInfo)) {
    const anchor = metadata(article).noteInfo.chapterUrl.split('#')[1]
    assert.ok(html.includes(`id="${anchor}"`))
  }
})

test('unsafe overview rendering does not change ordinary existing page rendering', t => {
  const root = fixture(t)
  overview(root, overviewMetadata, '<b>literal text</b>')
  assert.match(render(bookPage(buildNotePages(root))), /&lt;b&gt;/)
  const html = renderer.render('<div class="ordinary-page">正常页面</div>', { path: 'existing.md', relativePath: 'existing.md' })
  assert.match(html, /<div class="ordinary-page">正常页面<\/div>/)
  assert.doesNotMatch(html, /notes-safe-content/)
})
