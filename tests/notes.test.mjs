import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'
import { createMarkdownRenderer } from 'vitepress'
import mathjax3 from 'markdown-it-mathjax3'
import { loadNotes, buildNotePages } from '../docs/.vitepress/notes/catalog.mjs'
import { validateNoteSource, safeNotesMarkdown } from '../docs/.vitepress/notes/security.mjs'
import { downloadLinks } from '../docs/.vitepress/downloads.mjs'

const baseCatalog = {
  categories: [{ slug: 'llm', title: '大语言模型' }],
  books: [{ slug: 'book', category: 'llm', title: '学习书籍' }]
}
const baseMetadata = {
  title: '第一篇问题记录', slug: 'chapter-seven', category: 'llm', book: 'book',
  chapter: 7, chapterTitle: '指令微调', published: '2026-11-20'
}

function fixture(t, catalog = baseCatalog) {
  const root = mkdtempSync(path.join(tmpdir(), 'blog-notes-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  writeFileSync(path.join(root, 'catalog.json'), JSON.stringify(catalog), 'utf8')
  return root
}

function note(root, filename = 'notes.md', metadata = baseMetadata, body = '# 学习问题\n\n保留原始思路。\n') {
  const target = path.join(root, filename)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, `---\n${stringify(metadata)}---\n${body}`, 'utf8')
  return target
}

function frontmatter(content) {
  return parse(content.match(/^---\n([\s\S]*?)\n---/)[1])
}

test('minimal metadata generates home, category, book and a stable note URL', t => {
  const root = fixture(t)
  note(root, '任意文件名.md')
  const result = loadNotes(root)
  assert.equal(result.published.length, 1)
  assert.equal(result.notes[0].draft, false)
  assert.deepEqual(result.notes[0].tags, [])
  assert.equal(result.notes[0].url, '/notes/llm/book/chapter-seven.html')
  const pages = buildNotePages(root)
  assert.deepEqual(pages.map(page => page.params.page), ['index', 'llm/index', 'llm/book/index', 'llm/book/chapter-seven'])
  const article = frontmatter(pages.at(-1).content)
  assert.equal(article.learningNote, true)
  assert.equal(article.prev, false)
  assert.equal(article.next, false)
})

test('a second file is discovered without route changes and creates next/previous links', t => {
  const root = fixture(t)
  note(root, 'first.md')
  assert.equal(buildNotePages(root).length, 4)
  note(root, 'arbitrary/new-file.md', { ...baseMetadata, slug: 'chapter-eight', chapter: 8, chapterTitle: '下一章' })
  const pages = buildNotePages(root)
  assert.equal(pages.length, 5)
  const first = frontmatter(pages.find(page => page.params.page.endsWith('/chapter-seven')).content)
  const second = frontmatter(pages.find(page => page.params.page.endsWith('/chapter-eight')).content)
  assert.equal(first.next.link, '/notes/llm/book/chapter-eight.html')
  assert.equal(second.prev.link, '/notes/llm/book/chapter-seven.html')
  assert.equal(second.next, false)
})

test('pager titles are escaped for the default theme HTML renderer', t => {
  const root = fixture(t)
  note(root, 'first.md')
  note(root, 'second.md', {
    ...baseMetadata, slug: 'later', order: 1,
    title: '<img src=x onerror="alert(1)"> {{ unsafe() }}'
  })
  const first = buildNotePages(root).find(page => page.params.page.endsWith('/chapter-seven'))
  const title = frontmatter(first.content).next.text
  assert.doesNotMatch(title, /<img|\{\{ unsafe/)
  assert.match(title, /&#60;img/)
})

test('chapter number, same-chapter order, slug and topics determine browsing order', t => {
  const root = fixture(t)
  note(root, '01-ten.md', { ...baseMetadata, slug: 'chapter-ten', chapter: 10 })
  note(root, '99-two.md', { ...baseMetadata, slug: 'chapter-two', chapter: 2 })
  note(root, '00-seven-later.md', { ...baseMetadata, slug: 'later', order: 2 })
  note(root, '98-seven-b.md', { ...baseMetadata, slug: 'same-b' })
  note(root, '97-seven-a.md', { ...baseMetadata, slug: 'same-a' })
  const topic = { ...baseMetadata, slug: 'topic' }
  delete topic.chapter
  delete topic.chapterTitle
  note(root, '00-topic.md', topic)
  assert.deepEqual(loadNotes(root).published.map(item => item.slug), ['chapter-two', 'same-a', 'same-b', 'later', 'chapter-ten', 'topic'])
  const contents = buildNotePages(root).find(page => page.params.page === 'llm/book/index').content
  assert.ok(contents.indexOf('{#chapter-2}') < contents.indexOf('{#chapter-7}'))
  assert.ok(contents.indexOf('{#chapter-7}') < contents.indexOf('{#chapter-10}'))
  assert.ok(contents.indexOf('{#chapter-10}') < contents.indexOf('{#topics}'))
})

test('drafts are excluded from every generated output and do not create empty directories', t => {
  const root = fixture(t, {
    categories: [...baseCatalog.categories, { slug: 'empty-category', title: '空领域' }],
    books: [...baseCatalog.books, { slug: 'empty-book', category: 'empty-category', title: '空书籍' }]
  })
  note(root, 'published.md')
  note(root, 'draft.md', { ...baseMetadata, title: 'DRAFT_UNIQUE_TITLE', slug: 'secret-draft', draft: true }, 'SECRET_DRAFT_BODY')
  note(root, 'empty-book-draft.md', { ...baseMetadata, category: 'empty-category', book: 'empty-book', slug: 'only-draft', draft: true })
  const pages = buildNotePages(root)
  assert.equal(loadNotes(root).notes.length, 3)
  assert.equal(loadNotes(root).published.length, 1)
  assert.equal(pages.length, 4)
  assert.doesNotMatch(JSON.stringify(pages), /DRAFT_UNIQUE_TITLE|SECRET_DRAFT_BODY|secret-draft|empty-book|empty-category/)
  assert.match(pages.find(page => page.params.page === 'llm/book/index').content, /已发布 1 篇/)
})

test('a fully empty catalogue has only the notes landing page', t => {
  const root = fixture(t)
  assert.deepEqual(buildNotePages(root).map(page => page.params.page), ['index'])
})

test('same slug can be reused by different books without crossing their navigation', t => {
  const root = fixture(t, {
    ...baseCatalog,
    books: [...baseCatalog.books, { slug: 'other-book', category: 'llm', title: '另一书籍' }]
  })
  note(root, 'first.md')
  note(root, 'other.md', { ...baseMetadata, book: 'other-book' })
  const pages = buildNotePages(root).filter(page => page.params.page.endsWith('/chapter-seven'))
  assert.equal(pages.length, 2)
  for (const page of pages) {
    assert.equal(frontmatter(page.content).prev, false)
    assert.equal(frontmatter(page.content).next, false)
  }
})

for (const field of ['title', 'slug', 'category', 'book', 'published']) {
  test(`missing required ${field} fails with the source file`, t => {
    const root = fixture(t)
    const metadata = { ...baseMetadata }
    delete metadata[field]
    note(root, 'bad.md', metadata)
    assert.throws(() => loadNotes(root), error => /bad\.md/.test(error.message) && error.message.includes(field))
  })
}

const invalidMetadata = [
  ['unknown field', { head: [['script', {}, 'alert(1)']] }, /unknown field/],
  ['invalid slug', { slug: '../escape' }, /English slug/],
  ['reserved slug', { slug: 'index' }, /reserved/],
  ['zero chapter', { chapter: 0 }, /positive integer/],
  ['fractional chapter', { chapter: 2.5 }, /positive integer/],
  ['negative order', { order: -1 }, /non-negative integer/],
  ['invalid calendar date', { published: '2026-02-30' }, /valid YYYY-MM-DD/],
  ['noncanonical date', { published: '2026-2-3' }, /valid YYYY-MM-DD/],
  ['updated before publication', { updated: '2026-11-19' }, /earlier/],
  ['nonboolean draft', { draft: 'false' }, /boolean/],
  ['unknown status', { status: 'finished' }, /status/],
  ['nonarray tags', { tags: 'GPT-2' }, /array/],
  ['repeated tags', { tags: ['GPT-2', 'GPT-2'] }, /duplicate tags/],
  ['unknown category', { category: 'missing' }, /unknown category/],
  ['unknown book', { book: 'missing' }, /unknown book/],
  ['multiline title', { title: 'one\ntwo' }, /single-line/]
]
for (const [name, changes, errorPattern] of invalidMetadata) {
  test(`${name} is rejected rather than generating a broken page`, t => {
    const root = fixture(t)
    note(root, 'invalid.md', { ...baseMetadata, ...changes })
    assert.throws(() => loadNotes(root), errorPattern)
  })
}

test('duplicate YAML keys, missing frontmatter and empty bodies fail early', t => {
  const root = fixture(t)
  const target = note(root)
  writeFileSync(target, readFileSync(target, 'utf8').replace('title:', 'slug: duplicated\ntitle:'))
  assert.throws(() => loadNotes(root), /unique|duplicate|already/i)
  writeFileSync(target, '# No frontmatter')
  assert.throws(() => loadNotes(root), /frontmatter/)
  note(root, 'notes.md', baseMetadata, '   \n')
  assert.throws(() => loadNotes(root), /body must not be empty/)
})

test('duplicate note URLs are rejected even when one copy is a draft', t => {
  const root = fixture(t)
  note(root, 'a.md')
  note(root, 'b.md', { ...baseMetadata, draft: true })
  assert.throws(() => loadNotes(root), /duplicate note URL/)
})

test('chapter titles must agree and cannot be set on a chapterless topic', t => {
  const root = fixture(t)
  note(root, 'a.md')
  const other = { ...baseMetadata, slug: 'other', chapterTitle: '另一个章名' }
  note(root, 'b.md', other)
  assert.throws(() => loadNotes(root), /conflicting chapterTitle/)
  delete other.chapter
  note(root, 'b.md', other)
  assert.throws(() => loadNotes(root), /chapterTitle requires chapter/)
})

for (const [name, catalog, pattern] of [
  ['duplicate categories', { ...baseCatalog, categories: [...baseCatalog.categories, ...baseCatalog.categories] }, /duplicate category/],
  ['duplicate books', { ...baseCatalog, books: [...baseCatalog.books, ...baseCatalog.books] }, /duplicate book/],
  ['book references missing category', { ...baseCatalog, books: [{ ...baseCatalog.books[0], category: 'missing' }] }, /unknown category/],
  ['unknown catalog field', { ...baseCatalog, layouts: [] }, /unknown field/]
]) {
  test(name, t => assert.throws(() => loadNotes(fixture(t, catalog)), pattern))
}

test('metadata cannot inject Vue, HTML or Markdown into generated directory pages', t => {
  const root = fixture(t, {
    categories: [{ slug: 'llm', title: '<script>alert(1)</script> {{ evil() }}' }],
    books: [{ slug: 'book', category: 'llm', title: '[bad](javascript:alert(1))' }]
  })
  note(root, 'a.md', { ...baseMetadata, title: '{{ evil() }} <img onerror="alert(1)">' })
  const home = buildNotePages(root).find(page => page.params.page === 'index').content
  assert.doesNotMatch(home, /<script>|\{\{ evil|\[bad\]\(javascript:/)
})

test('loading and generating notes preserve the exact body including Chinese, code and CRLF', t => {
  const root = fixture(t)
  const body = '# 原始学习记录\r\n\r\n## Q1. 张量形状是什么？\r\n\r\n答案：`[B,T]`。\r\n\r\n```python\r\n# 保留缩进和空行\r\nfor item in batch:\r\n    print(item)\r\n\r\n```\r\n\r\n公式 $E=mc^2$。\r\n'
  note(root, 'original.md', baseMetadata, body)
  assert.equal(loadNotes(root).notes[0].body, body)
  const article = buildNotePages(root).find(page => page.params.page === 'llm/book/chapter-seven')
  assert.ok(article.content.includes(body))
})

for (const field of ['title', 'description']) {
  test(`note ${field} cannot inject VitePress file includes through frontmatter`, t => {
    const root = fixture(t)
    note(root, 'unsafe-metadata.md', { ...baseMetadata, [field]: '<!-- @include: ../../env.d.ts -->' })
    assert.throws(() => loadNotes(root), /include/i)
  })
  for (const entity of ['categories', 'books']) {
    test(`catalog ${entity} ${field} cannot inject VitePress file includes`, t => {
      const catalog = structuredClone(baseCatalog)
      catalog[entity][0][field] = '<!-- @include: ../../env.d.ts -->'
      const root = fixture(t, catalog)
      note(root)
      assert.throws(() => loadNotes(root), /include/i)
    })
  }
}

const rendererPublicDir = mkdtempSync(path.join(tmpdir(), 'blog-notes-images-'))
after(() => rmSync(rendererPublicDir, { recursive: true, force: true }))
const renderer = await createMarkdownRenderer(fileURLToPath(new URL('../docs/', import.meta.url)), {
  config(md) {
    md.use(mathjax3)
    md.use(safeNotesMarkdown, { publicDir: rendererPublicDir })
    md.use(downloadLinks, { base: '/code-between-pages/' })
  }
}, '/code-between-pages/')
function renderNote(body, md = renderer) {
  return md.render(`---\nlearningNote: true\n---\n${body}`, { path: 'notes/test.md', relativePath: 'notes/test.md' })
}

test('HTML, scripts, event attributes and Vue expressions remain inert text', () => {
  const html = renderNote('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n{{ constructor.constructor("alert(1)")() }}\n\n&#123;&#123; evil() &#125;&#125;\n\ntext {onclick="alert(1)"}')
  assert.match(html, /^<div v-pre class="notes-safe-content">/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script|<img|<[^>]+\sonclick=/)
  assert.match(html, /\{\{.*constructor/)
})

test('unsafe link protocols are not emitted while HTTPS, mail and internal links work', () => {
  const html = renderNote('[js](javascript:alert%281%29) [data](data:text/html,evil) [protocol-relative](//evil.example) [file](file:///etc/passwd)\n\n[web](https://example.com) [mail](mailto:hello@example.com) [internal](/notes/)')
  assert.doesNotMatch(html, /href="(?:javascript:|data:|file:|\/\/evil)/i)
  assert.match(html, /href="https:\/\/example.com"/)
  assert.match(html, /href="mailto:hello@example.com"/)
  assert.match(html, /href="\/code-between-pages\/notes\/"/)
})

test('public Python attachments download under the deployment base without becoming HTML routes', () => {
  const source = '[下载 Python 源文件](/downloads/llms-from-scratch/chapter-07-instruction-finetuning-commented.py)'
  for (const html of [renderNote(source), renderer.render(source)]) {
    assert.match(html, /href="\/code-between-pages\/downloads\/llms-from-scratch\/chapter-07-instruction-finetuning-commented\.py" download(?:="")?/)
    assert.doesNotMatch(html, /\.py\.html/)
  }
  const links = renderNote('[internal](/notes/) [external](https://example.com/downloads/file.py)')
  assert.doesNotMatch(links, /\sdownload(?:=|\s|>)/)
})

test('unsafe VitePress includes, snippets, containers and Vue fences are rejected', () => {
  for (const source of ['<!-- @include: ../../secret -->', '<<< ../../secret', '::: warning\nbody\n:::', '```python-vue\n{{ evil() }}\n```']) {
    assert.throws(() => validateNoteSource(source, 'unsafe.md'), /unsafe\.md/)
  }
  assert.doesNotThrow(() => validateNoteSource('```python\nprint("safe")\n```'))
})

test('headings, anchors, syntax highlighting, copy button and tables render together', () => {
  const html = renderNote('# 标题\n\n## 核心问题\n\n```python\nprint("' + 'long-value '.repeat(30) + '")\n```\n\n| 输入 | 目标 |\n| --- | --- |\n| [B,T] | [B,T] |')
  assert.match(html, /class="header-anchor"/)
  assert.match(html, /id="核心问题"/)
  assert.match(html, /language-python/)
  assert.match(html, /class="copy"/)
  assert.match(html, /<table\b/)
  assert.match(html, /shiki/)
})

test('inline and block formulas render with MathJax, without enabling TeX HTML/URL macros', () => {
  const html = renderNote('行内 $E=mc^2$。\n\n$$\n\\mathcal{L} = -\\frac{1}{N}\\sum_{i=1}^N \\log p_i\n$$')
  assert.equal([...html.matchAll(/<mjx-container /g)].length, 2)
  assert.match(html, /display="true"/)
  const unsafe = renderNote('$\\href{javascript:alert(1)}{click}$')
  assert.doesNotMatch(unsafe, /(?:href|xlink:href)="javascript:/i)
})

test('local images render from public; missing and escaping paths fail', () => {
  const publicDir = rendererPublicDir
  mkdirSync(path.join(publicDir, 'notes-assets'), { recursive: true })
  writeFileSync(path.join(publicDir, 'notes-assets', 'sample.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1UAAAAASUVORK5CYII=', 'base64'))
  const md = renderer
  const html = renderNote('![图示](/notes-assets/sample.png)\n\n*图：说明。*', md)
  // Vite resolves public asset deployment prefixes after Markdown rendering.
  assert.match(html, /src="\/notes-assets\/sample.png"/)
  assert.match(html, /alt="图示"/)
  assert.match(html, /<em>图：说明。<\/em>/)
  assert.throws(() => renderNote('![missing](/notes-assets/missing.png)', md), /不存在/)
  for (const url of ['./sample.png', '/notes-assets/../secret.png', '/notes-assets/%2e%2e/secret.png', 'http://example.com/picture.png']) {
    assert.throws(() => renderNote(`![unsafe](${url})`, md), /图片|路径/)
  }
  assert.match(renderNote('![remote](https://example.com/picture.png)', md), /src="https:\/\/example.com\/picture.png"/)
})

test('ordinary existing pages keep HTML rendering after a learning note is rendered', () => {
  renderNote('<b>literal</b>')
  const html = renderer.render('<div class="existing-page">kept</div>', { path: 'existing.md', relativePath: 'existing.md' })
  assert.match(html, /<div class="existing-page">kept<\/div>/)
  assert.doesNotMatch(html, /notes-safe-content/)
})

test('malicious code-fence language cannot inject an image or event handler', () => {
  const source = '~~~"><img/src=x/onerror=alert(1)>\ntext\n~~~'
  try {
    validateNoteSource(source, 'malicious-fence.md')
  } catch (error) {
    assert.match(error.message, /malicious-fence\.md/)
    return
  }
  const html = renderNote(source)
  assert.doesNotMatch(html, /<img\b|<[^>]+\sonerror\s*=/i)
})

test('GitHub-style alert title cannot inject raw HTML', () => {
  const html = renderNote('> [!NOTE] <img src=x onerror=alert(1)>\n> body')
  assert.doesNotMatch(html, /<img\b|<[^>]+\sonerror\s*=/i)
})
