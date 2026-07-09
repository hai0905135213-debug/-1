import { createApp } from 'vue'
import PreviewApp from './PreviewApp.vue'
import '../styles/global.css'
import './preview.css'

window.uni = {
  navigateTo({ url }) {
    window.dispatchEvent(new CustomEvent('preview:navigate', { detail: { url } }))
  },
  switchTab({ url }) {
    window.dispatchEvent(new CustomEvent('preview:navigate', { detail: { url } }))
  },
  navigateBack() {
    window.dispatchEvent(new CustomEvent('preview:back'))
  },
  showToast({ title }) {
    window.alert(title)
  }
}

createApp(PreviewApp).mount('#app')
