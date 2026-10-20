const http = require('http')
const fs = require('fs')
const path = require('path')

const root = __dirname
const port = Number(process.env.PORT || 5173)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
}

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  let requestPath
  try {
    requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch {
    res.writeHead(400)
    res.end('Invalid path')
    return
  }
  if (requestPath === '/') requestPath = '/index.html'
  const filePath = path.resolve(root, '.' + requestPath)

  if (!filePath.startsWith(root + path.sep)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }

    res.writeHead(200, {
      'Content-Type': types[path.extname(filePath)] || 'application/octet-stream'
    })
    res.end(data)
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Preview running at http://127.0.0.1:${port}`)
})
