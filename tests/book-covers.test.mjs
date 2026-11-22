import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stringify } from 'yaml'
import { createMarkdownRenderer } from 'vitepress'
import { parse as parseVue } from '@vue/compiler-dom'
import { compileTemplate } from '@vue/compiler-sfc'
import { loadNotes, buildNotePages } from '../docs/.vitepress/notes/catalog.mjs'

const book = { slug: 'existing-book', category: 'llm', title: '已有书籍', description: '保留书籍简介。' }

function fixture(t, books = [book]) {
  const root = mkdtempSync(path.join(tmpdir(), 'blog-book-covers-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(path.join(root, 'catalog.json'), JSON.stringify({
    categories: [{ slug: 'llm', title: '大语言模型' }], books
  }))
  for (const item of books) {
    const directory = path.join(root, item.category, item.slug)
    mkdirSync(directory, { recursive: true })
    writeFileSync(path.join(directory, 'index.md'), `---\n${stringify({
      title: item.title, category: item.category, book: item.slug, published: '2026-11-22'
    })}---\n# 书籍学习记录\n`)
  }
  return root
}

const renderer = await createMarkdownRenderer(fileURLToPath(new URL('../docs/', import.meta.url)), {}, '/code-between-pages/')

function render(page) {
  return renderer.render(page.content, { path: 'notes/test.md', relativePath: 'notes/test.md' })
}

function coverNodes(html) {
  const found = []
  function visit(node) {
    if (node.type === 1 && node.tag === 'BookCover') found.push(node)
    for (const child of node.children ?? []) visit(child)
  }
  visit(parseVue(html))
  return found
}

function attributes(node) {
  // Static attributes stay data; directives here would execute as Vue code.
  assert.ok(node.props.every(prop => prop.type === 6))
  return Object.fromEntries(node.props.map(prop => [prop.name, prop.value?.content]))
}

test('books without cover keep their route, description and metadata with a default cover', t => {
  const pages = buildNotePages(fixture(t))
  assert.deepEqual(pages.map(page => page.params.page), ['index', 'llm/index', 'llm/existing-book/index'])
  for (const page of pages.slice(0, 2)) {
    const html = render(page)
    const [cover] = coverNodes(html)
    assert.deepEqual(attributes(cover), { title: book.title, href: '/notes/llm/existing-book/' })
    assert.ok(html.includes(book.description))
    assert.match(html, /0 篇笔记/)
    assert.match(html, /2026-11-22/)
    assert.match(html, /href="\/code-between-pages\/notes\/llm\/existing-book\/"/)
  }
})

test('a future book automatically adds its configured cover to both card directories', t => {
  const futureBook = { slug: 'future-book', category: 'llm', title: '新书', cover: '/images/book-covers/future-book.jpg' }
  const root = fixture(t, [book, futureBook])
  assert.equal(loadNotes(root).catalog.books[1].cover, futureBook.cover)
  const pages = buildNotePages(root)
  for (const route of ['index', 'llm/index']) {
    const cards = coverNodes(render(pages.find(page => page.params.page === route))).map(attributes)
    assert.equal(cards.length, 2)
    assert.deepEqual(cards[1], { title: futureBook.title, href: '/notes/llm/future-book/', src: futureBook.cover })
  }
  assert.ok(pages.some(page => page.params.page === 'llm/future-book/index'))
})

test('a missing cover file remains a runtime fallback rather than a required build asset', t => {
  const root = fixture(t, [{ ...book, cover: '/images/book-covers/not-installed-yet.webp' }])
  const html = render(buildNotePages(root)[0])
  const compiled = compileTemplate({ source: html, filename: 'notes-cover-test.vue', id: 'notes-cover-test' })
  assert.deepEqual(compiled.errors, [])
  assert.equal(attributes(coverNodes(html)[0]).src, '/images/book-covers/not-installed-yet.webp')
  assert.doesNotMatch(compiled.code, /import[^\n]+book-covers/)
})

test('unsafe, external and escaping cover values are rejected with a useful field error', t => {
  for (const cover of [
    'https://example.com/cover.jpg', '//example.com/cover.jpg', 'javascript:alert(1)',
    '/images/book-covers/../private.jpg', '/images/book-covers/%2e%2e/private.jpg',
    '/notes-assets/cover.jpg', '/images/book-covers/book.jpg" @error="alert(1)',
    '/images/book-covers/book.vue', '', null, 123
  ]) {
    const root = fixture(t, [{ ...book, cover }])
    assert.throws(() => loadNotes(root), error => /catalog\.json/.test(error.message) && /cover/.test(error.message))
  }
})

test('quotes, markup and Vue-looking text in titles remain literal component properties', t => {
  const title = '书名 "quoted" & <img src=x onerror="alert(1)"> {{ unsafe() }}'
  const root = fixture(t, [{ ...book, title, cover: '/images/book-covers/book.png' }])
  const html = render(buildNotePages(root)[0])
  const [cover] = coverNodes(html)
  assert.deepEqual(attributes(cover), { title, href: '/notes/llm/existing-book/', src: '/images/book-covers/book.png' })
  assert.doesNotMatch(html, /<img\b|<script\b/)
  const compiled = compileTemplate({ source: html, filename: 'notes-cover-test.vue', id: 'notes-cover-test' })
  assert.deepEqual(compiled.errors, [])
  assert.doesNotMatch(compiled.code, /_ctx\.unsafe\(|onError:/)
})
