import process from 'node:process'
import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt'],
  runtimeConfig: {
    mipBackendBaseUrl:
      process.env.NUXT_MIP_BACKEND_BASE_URL
      || process.env.MIP_BACKEND_BASE_URL
      || 'https://2duarps7o5.execute-api.us-east-1.amazonaws.com',
    mipBackendApiToken:
      process.env.NUXT_MIP_BACKEND_API_TOKEN
      || process.env.MIP_BACKEND_API_TOKEN
      || '',
    instagramApiToken:
      process.env.IG_API
      || process.env.INSTAGRAM_ACCESS_TOKEN
      || '',
  },
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },
})
