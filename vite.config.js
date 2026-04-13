import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve'

  return {
    plugins: [vue()],
    base: isDev ? '/' : '/echarts-demo/',
    define: {
      __APP_ENV__: JSON.stringify(mode),
    },
  }
})
