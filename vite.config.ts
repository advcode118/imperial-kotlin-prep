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

export default defineConfig({
  base: '/imperial-kotlin-prep/',
  plugins: [react(), yamlContent()],
  build: { chunkSizeWarningLimit: 1500 },
})
