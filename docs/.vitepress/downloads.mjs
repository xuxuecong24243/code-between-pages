// Mark public attachments as native downloads before VitePress rewrites links.
export function downloadLinks(md, { base = '/' } = {}) {
  const linkOpen = md.renderer.rules.link_open
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const href = token.attrGet('href') || ''
    if (href.startsWith('/downloads/')) {
      token.attrSet('href', `${base.replace(/\/$/, '')}${href}`)
      token.attrSet('download', '')
    }
    return linkOpen
      ? linkOpen(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options)
  }
}
