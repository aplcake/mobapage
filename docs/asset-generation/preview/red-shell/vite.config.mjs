import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { createGlowbudOwnerMiddleware } from './glowbudsOpenSeaOwner'
import { createGlowbudWalletMiddleware } from './glowbudsWalletOwnership'

const studio = fileURLToPath(new URL('./index.html', import.meta.url))
const display = fileURLToPath(new URL('./display.html', import.meta.url))
const wardrobe = fileURLToPath(new URL('./wardrobe.html', import.meta.url))
const assetExport = fileURLToPath(new URL('./export.html', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ownerMiddleware = createGlowbudOwnerMiddleware({
    apiKey: env.OPENSEA_API_KEY,
    chain: 'abstract',
    contract: '0x40148d9aec2d0aed12ccf556cd7cd79c15197644',
  })
  const walletMiddleware = createGlowbudWalletMiddleware({
    apiKey: env.OPENSEA_API_KEY,
    chain: 'abstract',
    collectionSlug: 'glowbuds',
    contract: '0x40148d9aec2d0aed12ccf556cd7cd79c15197644',
    rpcUrl: 'https://api.mainnet.abs.xyz',
    tokenRange: [1, 3333],
  })
  const ownerPlugin = {
    name: 'glowbuds-opensea-owner',
    configureServer(server) {
      server.middlewares.use(ownerMiddleware)
      server.middlewares.use(walletMiddleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(ownerMiddleware)
      server.middlewares.use(walletMiddleware)
    },
  }

  return {
    plugins: [ownerPlugin],
    build: {
      rollupOptions: {
        input: {
          studio,
          display,
          wardrobe,
          export: assetExport,
        },
      },
    },
  }
})
