import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { parse } from 'yaml'

/** Content is authored in YAML (block scalars keep Kotlin free of escaping) and compiled to JSON modules. */
export function yamlContent(): Plugin {
  return {
    name: 'yaml-content',
    transform(code, id) {
      if (!/\.ya?ml$/.test(id)) return null
      try {
        return { code: `export default ${JSON.stringify(parse(code))}`, map: null }
      } catch (e) {
        this.error(`${id}: ${e instanceof Error ? e.message : e}`)
      }
    },
  }
}

/**
 * Two kinds of preload, written into index.html at build time:
 *  - the two fonts used above the fold;
 *  - the chunk for the page the URL points at. Routing is by hash, so a tiny inline
 *    script picks the chunk and adds <link rel="modulepreload"> while the main bundle
 *    is still downloading, instead of after it has run.
 */
function preloads(): Plugin {
  const ROUTES: [string, string][] = [
    ['/lesson/', 'Lesson'],
    ['/drills/', 'Drills'],
    ['/drills', 'Drills'],
    ['/pre-ppt', 'PrePpt'],
    ['/technique', 'Technique'],
    ['/week/', 'Overview'],
  ]
  return {
    name: 'preloads',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return []
        const base = '/imperial-kotlin-prep/'
        const chunks = Object.values(ctx.bundle).filter((c) => c.type === 'chunk')
        const entry = chunks.find((c) => c.isEntry)
        const skip = new Set([entry?.fileName, ...(entry?.imports ?? [])])
        const closure = (name: string) => {
          const seen = new Set<string>()
          const visit = (file: string) => {
            if (seen.has(file) || skip.has(file)) return
            seen.add(file)
            chunks.find((c) => c.fileName === file)?.imports.forEach(visit)
          }
          const root = chunks.find((c) => c.name === name)
          if (root) visit(root.fileName)
          return [...seen]
        }
        const table = ROUTES.map(([prefix, name]) => [prefix, closure(name)])
        const script =
          `(function(){var h=location.hash,t=${JSON.stringify(table)};` +
          `for(var i=0;i<t.length;i++)if(h.indexOf(t[i][0])>=0){t[i][1].forEach(function(f){` +
          `var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href='${base}'+f;document.head.appendChild(l)});break}})()`
        const fonts = Object.keys(ctx.bundle)
          .filter((f) => /(source-serif-4-latin-wght-normal|inter-latin-wght-normal)[^/]*\.woff2$/.test(f))
          .map((f) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: base + f, crossorigin: '' },
            injectTo: 'head' as const,
          }))
        return [...fonts, { tag: 'script', children: script, injectTo: 'head' as const }]
      },
    },
  }
}

export default defineConfig({
  base: '/imperial-kotlin-prep/',
  plugins: [react(), yamlContent(), preloads()],
  build: { chunkSizeWarningLimit: 700 },
})
