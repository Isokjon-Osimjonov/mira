export function assertNotProduction() {
  const dbUrl = process.env.DATABASE_URL ?? ''
  const isProd = dbUrl.includes('postgres:5432') || process.env.NODE_ENV === 'production'

  if (isProd) {
    console.error(
      '\n🛑 BLOCKED: This script detected it is running ' +
        'against what looks like the PRODUCTION database ' +
        '(DATABASE_URL or NODE_ENV indicates production).\n' +
        'If you genuinely intend to run this against ' +
        'production, you must explicitly pass ' +
        'ALLOW_PRODUCTION=true as an environment variable.\n'
    )
    if (process.env.ALLOW_PRODUCTION !== 'true') {
      process.exit(1)
    }
    console.warn('⚠️  ALLOW_PRODUCTION=true detected — proceeding anyway.\n')
  }
}
