import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0.15,
      resizeOptions: { fit: 'contain', background: '#ffffff' },
    },
  },
  images: ['logo-source.svg'],
})
