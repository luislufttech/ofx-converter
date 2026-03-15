import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Serve index.html for bare directory paths (e.g. /blog/ → /blog/index.html)
// Vite dev/preview don't do this automatically; Netlify does it natively.
function serveDirectoryIndex() {
  return {
    name: 'serve-directory-index',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url.endsWith('/') && req.url !== '/') {
          const candidate = path.resolve('public', req.url.slice(1), 'index.html')
          if (fs.existsSync(candidate)) req.url += 'index.html'
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url.endsWith('/') && req.url !== '/') {
          const candidate = path.resolve('dist', req.url.slice(1), 'index.html')
          if (fs.existsSync(candidate)) req.url += 'index.html'
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveDirectoryIndex()],
})
