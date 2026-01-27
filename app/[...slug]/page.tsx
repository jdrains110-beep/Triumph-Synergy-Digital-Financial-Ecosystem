'use server'

/**
 * Proxy page requests to Pi Studio Triumph Synergy app
 * This catch-all route handles all unmapped page requests
 * EXCLUDES: api routes, and other special routes
 */
export default async function ProxyPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params

  // EXCLUDE API routes - let Next.js handle them naturally
  if (slug && slug[0] === 'api') {
    return <div>API route should not be handled by catch-all</div>
  }

  // TEMPORARILY DISABLED: Catch-all route interfering with static files
  // Let Next.js handle static files and 404s naturally
  return <div>Page not found</div>
}
