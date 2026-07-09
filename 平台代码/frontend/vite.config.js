const { defineConfig } = require('vite')
const vue = require('@vitejs/plugin-vue')

function miniProgramPreviewTransform() {
  return {
    name: 'mini-program-preview-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.vue')) {
        return null
      }

      const transformed = code
        .replace(/<view\b/g, '<div')
        .replace(/<\/view>/g, '</div>')
        .replace(/<text\b/g, '<span')
        .replace(/<\/text>/g, '</span>')
        .replace(/<image\b/g, '<img')
        .replace(/<\/image>/g, '</img>')
        .replace(/<scroll-view\b([^>]*)scroll-x([^>]*)>/g, '<div$1$2 class="preview-scroll" data-scroll-x="true">')
        .replace(/<scroll-view\b/g, '<div')
        .replace(/<\/scroll-view>/g, '</div>')
        .replace(/@tap=/g, '@click=')

      return {
        code: transformed,
        map: null
      }
    }
  }
}

module.exports = defineConfig({
  plugins: [miniProgramPreviewTransform(), vue()],
  server: {
    host: '127.0.0.1',
    port: 5173
  }
})
