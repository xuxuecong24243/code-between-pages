import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument, stringify } from 'yaml'
import { validateNoteSource } from './security.mjs'

export const defaultNotesRoot = fileURLToPath(new URL('../../notes/content/', import.meta.url))

const noteFields = new Set([
  'title', 'slug', 'category', 'book', 'chapter', 'chapterTitle', 'published',
  'updated', 'draft', 'tags', 'status', 'order', 'description'
])
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function fail(file, message) {
  throw new Error(`[notes] ${file}: ${message}`)
}

function object(value, file, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(file, `${name} must be an object`)
}

function keys(value, allowed, file) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(file, `unknown field "${key}"`)
  }
}

function text(value, file, name, optional = false) {
  if (value === undefined && optional) return
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    fail(file, `${name} must be a non-empty, single-line string`)
  }
  if (/<!--\s*@include\b/.test(value)) fail(file, `${name} must not contain VitePress include directives`)
}

function slug(value, file, name) {
  text(value, file, name)
  if (!slugPattern.test(value) || value === 'index') fail(file, `${name} must be an English slug (index is reserved)`)
}

function date(value, file, name, optional = false) {
  if (value === undefined && optional) return
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || Number.isNaN(Date.parse(`${value}T00:00:00Z`))
      || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    fail(file, `${name} must be a valid YYYY-MM-DD date`)
  }
}

function readCatalog(root) {
  const file = join(root, 'catalog.json')
  let catalog
  try { catalog = JSON.parse(readFileSync(file, 'utf8')) } catch (error) { fail(file, error.message) }
  object(catalog, file, 'catalog')
  keys(catalog, new Set(['categories', 'books']), file)
  if (!Array.isArray(catalog.categories) || !Array.isArray(catalog.books)) fail(file, 'categories and books must be arrays')
  const categorySlugs = new Set()
  const bookKeys = new Set()
  for (const category of catalog.categories) {
    object(category, file, 'category')
    keys(category, new Set(['slug', 'title', 'description']), file)
    slug(category.slug, file, 'category.slug')
    text(category.title, file, 'category.title')
    text(category.description, file, 'category.description', true)
    if (categorySlugs.has(category.slug)) fail(file, `duplicate category slug "${category.slug}"`)
    categorySlugs.add(category.slug)
  }
  for (const book of catalog.books) {
    object(book, file, 'book')
    keys(book, new Set(['slug', 'category', 'title', 'description']), file)
    slug(book.slug, file, 'book.slug')
    slug(book.category, file, 'book.category')
    text(book.title, file, 'book.title')
    text(book.description, file, 'book.description', true)
    if (!categorySlugs.has(book.category)) fail(file, `unknown category "${book.category}" for book "${book.slug}"`)
    const key = `${book.category}/${book.slug}`
    if (bookKeys.has(key)) fail(file, `duplicate book slug "${key}"`)
    bookKeys.add(key)
  }
  return catalog
}

function markdownFiles(root) {
  return readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    const file = join(root, entry.name)
    if (entry.isSymbolicLink()) fail(file, 'symbolic links are not allowed in note sources')
    if (entry.isDirectory()) return markdownFiles(file)
    return entry.name.endsWith('.md') ? [file] : []
  })
}

export function compareNotes(a, b) {
  return (a.chapter ?? Number.MAX_SAFE_INTEGER) - (b.chapter ?? Number.MAX_SAFE_INTEGER)
    || (a.order ?? 0) - (b.order ?? 0)
    || a.slug.localeCompare(b.slug, 'en')
}

/** Validate every source, including drafts. No page template or UI code lives in a note. */
export function loadNotes(root = defaultNotesRoot) {
  root = resolve(root)
  const catalog = readCatalog(root)
  const categories = new Map(catalog.categories.map(category => [category.slug, category]))
  const books = new Map(catalog.books.map(book => [`${book.category}/${book.slug}`, book]))
  const urls = new Set()
  const chapterTitles = new Map()
  const notes = markdownFiles(root).map(file => {
    const source = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
    if (!match) fail(file, 'missing YAML frontmatter')
    const document = parseDocument(match[1], { uniqueKeys: true })
    if (document.errors.length) fail(file, document.errors.map(error => error.message).join('; '))
    let metadata
    try { metadata = document.toJS({ maxAliasCount: 0 }) } catch (error) { fail(file, error.message) }
    object(metadata, file, 'frontmatter')
    keys(metadata, noteFields, file)
    for (const field of ['title', 'slug', 'category', 'book']) text(metadata[field], file, field)
    for (const field of ['slug', 'category', 'book']) slug(metadata[field], file, field)
    text(metadata.chapterTitle, file, 'chapterTitle', true)
    text(metadata.description, file, 'description', true)
    if (metadata.chapter !== undefined && (!Number.isSafeInteger(metadata.chapter) || metadata.chapter < 1)) {
      fail(file, 'chapter must be a positive integer; omit it for a topic note')
    }
    if (metadata.chapterTitle !== undefined && metadata.chapter === undefined) fail(file, 'chapterTitle requires chapter')
    if (metadata.order !== undefined && (!Number.isSafeInteger(metadata.order) || metadata.order < 0)) fail(file, 'order must be a non-negative integer')
    date(metadata.published, file, 'published')
    date(metadata.updated, file, 'updated', true)
    if (metadata.updated && metadata.updated < metadata.published) fail(file, 'updated must not be earlier than published')
    if (metadata.draft !== undefined && typeof metadata.draft !== 'boolean') fail(file, 'draft must be a boolean')
    if (metadata.status !== undefined && !['in-progress', 'completed', 'reviewing'].includes(metadata.status)) {
      fail(file, 'status must be in-progress, completed, or reviewing')
    }
    if (metadata.tags !== undefined) {
      if (!Array.isArray(metadata.tags)) fail(file, 'tags must be an array of strings')
      metadata.tags.forEach(tag => text(tag, file, 'tag'))
      if (new Set(metadata.tags).size !== metadata.tags.length) fail(file, 'duplicate tags')
    }
    if (!categories.has(metadata.category)) fail(file, `unknown category "${metadata.category}"`)
    const bookKey = `${metadata.category}/${metadata.book}`
    if (!books.has(bookKey)) fail(file, `unknown book "${bookKey}"`)
    const url = `/notes/${bookKey}/${metadata.slug}.html`
    if (urls.has(url)) fail(file, `duplicate note URL "${url}"`)
    urls.add(url)
    if (metadata.chapterTitle) {
      const key = `${bookKey}/${metadata.chapter}`
      if (chapterTitles.has(key) && chapterTitles.get(key) !== metadata.chapterTitle) fail(file, `conflicting chapterTitle for chapter ${metadata.chapter}`)
      chapterTitles.set(key, metadata.chapterTitle)
    }
    const body = source.slice(match[0].length)
    if (!body.trim()) fail(file, 'note body must not be empty')
    validateNoteSource(body, file)
    return { ...metadata, draft: metadata.draft ?? false, tags: metadata.tags ?? [], file, body, url, bookKey }
  }).sort((a, b) => a.bookKey.localeCompare(b.bookKey, 'en') || compareNotes(a, b))
  return { catalog, categories, books, notes, published: notes.filter(note => !note.draft) }
}

// Encoding all Markdown punctuation also prevents metadata from introducing HTML,
// Vue interpolation, includes, or links into generated pages.
function display(value = '') {
  return value.replace(/[&<>"'`*_[\]{}()#!|\\]/g, character => `&#${character.charCodeAt(0)};`)
}

function link(label, url) {
  return `[${display(label)}](${url})`
}

function page(frontmatter, body) {
  return `---\n${stringify(frontmatter)}---\n\n${body}`
}

function latest(notes) {
  return notes.map(note => note.updated ?? note.published).sort().at(-1)
}

function chapterLabel(note, notes) {
  if (note.chapter === undefined) return '专题笔记'
  const title = notes.find(candidate => candidate.chapter === note.chapter && candidate.chapterTitle)?.chapterTitle
  return `第 ${note.chapter} 章${title ? `：${title}` : ''}`
}

function bookCard(book, notes, category) {
  return `<div class="notes-book-card">\n\n### ${link(book.title, `/notes/${book.category}/${book.slug}/`)}\n\n${display(book.description ?? '')}\n\n${display(category.title)} · ${notes.length} 篇笔记 · 最近更新 ${latest(notes)}\n\n</div>`
}

/** VitePress's native dynamic route loader consumes these paths at build time. */
export function buildNotePages(root = defaultNotesRoot) {
  const { catalog, categories, published } = loadNotes(root)
  const paths = []
  const populatedBooks = catalog.books.filter(book => published.some(note => note.bookKey === `${book.category}/${book.slug}`))
  const populatedCategories = catalog.categories.filter(category => populatedBooks.some(book => book.category === category.slug))
  const add = (route, title, body, frontmatter = {}) => paths.push({
    params: { page: route },
    content: page({ title, sidebar: false, pageClass: 'notes-index', outline: { level: [2, 3], label: '本页目录' }, ...frontmatter }, body)
  })
  const notesFor = book => published.filter(note => note.bookKey === `${book.category}/${book.slug}`).sort(compareNotes)

  const homeSections = populatedCategories.map(category => {
    const cards = populatedBooks.filter(book => book.category === category.slug)
      .map(book => bookCard(book, notesFor(book), category)).join('\n\n')
    return `## ${display(category.title)}\n\n${display(category.description ?? '')}\n\n${link('浏览此领域', `/notes/${category.slug}/`)}\n\n<div class="notes-book-grid">\n\n${cards}\n\n</div>`
  }).join('\n\n')
  add('index', '学习笔记', `# 学习笔记\n\n按技术领域与书籍，整理阅读、实践中遇到的问题，以及逐步形成的理解。\n\n${homeSections || '还没有已发布的学习笔记。'}\n`)

  for (const category of populatedCategories) {
    const cards = populatedBooks.filter(book => book.category === category.slug)
      .map(book => bookCard(book, notesFor(book), category)).join('\n\n')
    add(`${category.slug}/index`, `${category.title}学习笔记`, `${link('学习笔记', '/notes/')}\n\n# ${display(category.title)}\n\n${display(category.description ?? '')}\n\n<div class="notes-book-grid">\n\n${cards}\n\n</div>\n`)
  }

  for (const book of populatedBooks) {
    const bookNotes = notesFor(book)
    const category = categories.get(book.category)
    const bookUrl = `/notes/${book.category}/${book.slug}/`
    const chapterNumbers = [...new Set(bookNotes.map(note => note.chapter))]
    const chapters = chapterNumbers.map(chapter => {
      const group = bookNotes.filter(note => note.chapter === chapter)
      const label = chapterLabel(group[0], bookNotes)
      const anchor = chapter === undefined ? 'topics' : `chapter-${chapter}`
      return `## ${display(label)} {#${anchor}}\n\n${group.map(note => `- ${link(note.title, note.url)} · 更新 ${note.updated ?? note.published}`).join('\n')}`
    }).join('\n\n')
    const chapterLinks = chapterNumbers.map(chapter => {
      const note = bookNotes.find(note => note.chapter === chapter)
      return `- ${link(chapterLabel(note, bookNotes), chapter === undefined ? '#topics' : `#chapter-${chapter}`)}`
    }).join('\n')
    add(`${book.category}/${book.slug}/index`, book.title, `${link('学习笔记', '/notes/')} / ${link(category.title, `/notes/${category.slug}/`)}\n\n# ${display(book.title)}\n\n${display(book.description ?? '')}\n\n已发布 ${bookNotes.length} 篇笔记 · 最近更新 ${latest(bookNotes)}\n\n## 章节目录\n\n${chapterLinks}\n\n${chapters}\n`)

    bookNotes.forEach((note, index) => {
      const label = chapterLabel(note, bookNotes)
      const anchor = note.chapter === undefined ? 'topics' : `chapter-${note.chapter}`
      const navigation = `${link('学习笔记', '/notes/')} / ${link(category.title, `/notes/${category.slug}/`)} / ${link(book.title, bookUrl)} / ${link(label, `${bookUrl}#${anchor}`)}`
      const dates = `发布于 ${note.published} · 更新于 ${note.updated ?? note.published}`
      const tags = note.tags.length ? `\n\n标签：${note.tags.map(display).join(' · ')}` : ''
      const previous = bookNotes[index - 1]
      const next = bookNotes[index + 1]
      add(`${note.bookKey}/${note.slug}`, note.title,
        `${navigation}\n\n${dates}${tags}\n\n${note.body}\n\n---\n\n${link('返回书籍目录', bookUrl)}\n`,
        {
          learningNote: true,
          pageClass: 'learning-note',
          description: note.description ?? `${book.title} · ${label} · ${note.title}`,
          prev: previous ? { text: `上一篇：${previous.title}`, link: previous.url } : false,
          next: next ? { text: `下一篇：${next.title}`, link: next.url } : false
        })
    })
  }
  return paths
}
