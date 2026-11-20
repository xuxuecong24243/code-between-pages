import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mathjax3 from 'markdown-it-mathjax3'

const defaultPublicDir = fileURLToPath(new URL('../../public/', import.meta.url))

// Includes are processed by VitePress before markdown-it (even inside fences).
export function validateNoteSource(body, file = 'note') {
  if (/<!--\s*@include\b|<<<\s|(?:^|\n)[\s>]*:{3,}|(?:`{3,}|~{3,})[^\n]*-vue\b/.test(body)) {
    throw new Error(`${file}: 学习笔记不允许 include、snippet、Vue 围栏或自定义容器；请使用普通 Markdown`)
  }
}

export function safeNotesMarkdown(md, { publicDir = defaultPublicDir } = {}) {
  // Keep the site's existing math renderer for existing pages. Notes use a
  // restricted TeX package set, without HTML, URL, require or autoload macros.
  const safeMath = { inline: { ruler: { after() {} } }, block: { ruler: { after() {} } }, renderer: { rules: {} } }
  mathjax3(safeMath, { tex: { packages: ['base', 'ams', 'newcommand', 'boldsymbol'], maxBuffer: 20 * 1024 } })
  for (const name of ['math_inline', 'math_block']) {
    const original = md.renderer.rules[name]
    md.renderer.rules[name] = (...args) => args[3]?.safeLearningNote
      ? safeMath.renderer.rules[name](...args)
      : original(...args)
  }

  const imageRule = md.renderer.rules.image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    if (env.safeLearningNote) {
      const src = tokens[idx].attrGet('src') || ''
      if (!/^https:\/\//i.test(src)) {
        let decoded
        try { decoded = decodeURIComponent(src) } catch { throw new Error(`非法图片路径: ${src}`) }
        if (!/^\/notes-assets\/[a-zA-Z0-9_./-]+\.(png|jpe?g|gif|webp|avif|svg)$/i.test(decoded) || decoded.split('/').includes('..')) {
          throw new Error(`笔记图片请使用 /notes-assets/... 或 HTTPS URL: ${src}`)
        }
        const target = path.resolve(publicDir, `.${decoded}`)
        if (!existsSync(target)) throw new Error(`笔记图片不存在: ${src}`)
        const relative = path.relative(realpathSync(publicDir), realpathSync(target))
        if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`图片越出 public 目录: ${src}`)
      }
    }
    return imageRule(tokens, idx, options, env, self)
  }

  const fenceRule = md.renderer.rules.fence
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    // VitePress interpolates the fence language into its wrapper HTML.
    // Unrecognized/unsafe fence metadata is displayed as plain code.
    if (env.safeLearningNote && !/^[\w+#.-]*(?:\s+\{[\d,\s-]+\})?$/.test(tokens[idx].info.trim())) {
      tokens[idx].info = 'text'
    }
    return fenceRule(tokens, idx, options, env, self)
  }

  const render = md.render.bind(md)
  const validateLink = md.validateLink.bind(md)
  md.render = (source, env = {}) => {
    // Only generated note frontmatter can set this field; author metadata is
    // whitelisted by catalog.mjs and never copied wholesale into a Vue page.
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)/)?.[1] || ''
    const note = /^learningNote: true\r?$/m.test(frontmatter)
    if (!note) return render(source, env)
    const oldHtml = md.options.html
    env.safeLearningNote = true
    md.options.html = false
    md.core.ruler.disable('curly_attributes', true)
    md.core.ruler.disable('github-alerts', true)
    md.block.ruler.disable('snippet', true)
    md.validateLink = (url) => validateLink(url) && (/^(?:https?:|mailto:)/i.test(url) || !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url))
    try {
      // v-pre also protects Vue interpolation written via HTML entities.
      return `<div v-pre class="notes-safe-content">${render(source, env)}</div>`
    } finally {
      md.options.html = oldHtml
      md.validateLink = validateLink
      md.core.ruler.enable('curly_attributes', true)
      md.core.ruler.enable('github-alerts', true)
      md.block.ruler.enable('snippet', true)
    }
  }
}
