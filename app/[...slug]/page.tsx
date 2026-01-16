'use server'

/**
 * Proxy page requests to Pi Studio Triumph Synergy app
 * This catch-all route handles all unmapped page requests
 */
export default async function ProxyPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  try {
    const resolvedParams = await params
    const path = resolvedParams.slug.join('/')
    const piStudioUrl = `https://triumphsynergy0576.pinet.com/${path}`

    const response = await fetch(piStudioUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return <div>Page not found</div>
    }

    const html = await response.text()

    return (
      <div suppressHydrationWarning>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    )
  } catch (error) {
    console.error('[Page Proxy Error]', error)
    return <div>Error loading page</div>
  }
}
