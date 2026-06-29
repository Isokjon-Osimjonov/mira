const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Monorepo uchun: default watchFolders ga qo'shamiz (o'rniga emas)
config.watchFolders = [...(config.watchFolders || []), monorepoRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// pnpm symlinks uchun kerak — expo doctor warning ni ignore qiling
config.resolver.unstable_enableSymlinks = true

module.exports = config
