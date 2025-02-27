import process from 'node:process'
// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
  ],
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
  },
  runtimeConfig: {
    // Server-side environment variables
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  },
  googleFonts: {
    families: {
      'Lustria': true,
      'Lato': true,
      'Space Mono': true,
    },
  },
  appConfig: {
    version: process.env.npm_package_version || '0.0.0',
    lastUpdated: new Date().toISOString(),
  },
  eslint: {
    cache: false, // Try disabling cache first
    lintOnStart: false, // Disable linting on start to reduce initial load
    include: ['**/*.{js,jsx,ts,tsx,vue}'],
    exclude: ['node_modules', 'dist'],
  },
})
