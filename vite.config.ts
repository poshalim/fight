import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function basicAuthPlugin() {
  const enabled = process.env.BASIC_AUTH_ENABLED !== 'false'
  const user = process.env.BASIC_AUTH_USER || 'stream'
  const pass = process.env.BASIC_AUTH_PASS || 'fight'

  if (!enabled) return { name: 'basic-auth-disabled' }

  return {
    name: 'basic-auth',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const header = req.headers.authorization || ''
        if (header.startsWith('Basic ')) {
          const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
          const [u, p] = decoded.split(':')
          if (u === user && p === pass) return next()
        }
        res.statusCode = 401
        res.setHeader('WWW-Authenticate', 'Basic realm="fight"')
        res.end('Auth required')
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), basicAuthPlugin()],
  server: {
    port: 5173,
    host: true
  }
})
