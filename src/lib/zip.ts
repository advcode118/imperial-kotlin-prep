import { strToU8, zipSync } from 'fflate'

export function downloadZip(name: string, files: { path: string; content: string }[]) {
  const tree: Record<string, Uint8Array> = {}
  for (const f of files) tree[f.path] = strToU8(f.content)
  const blob = new Blob([zipSync(tree) as BlobPart], { type: 'application/zip' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
