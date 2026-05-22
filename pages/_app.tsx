// core styles shared by all of react-notion-x (required)
import 'react-notion-x/styles.css'
// global styles shared across the entire site
import 'styles/global.css'
// global style overrides for notion
import 'styles/notion.css'
// global style overrides for prism theme (optional – base prism CSS is lazy-loaded with Code block)
import 'styles/prism-theme.css'

// katex CSS is lazy-loaded via components/notion-equation.tsx
// prismjs CSS is lazy-loaded via components/notion-code.tsx

import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import * as React from 'react'

import { bootstrap } from '@/lib/bootstrap-client'
import {
  fathomConfig,
  fathomId,
  isServer,
  posthogConfig,
  posthogId
} from '@/lib/config'

if (!isServer) {
  bootstrap()
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  React.useEffect(() => {
    if (fathomId) {
      const id = fathomId
      import('fathom-client').then((Fathom) => {
        Fathom.load(id, fathomConfig)
      })
    }

    if (posthogId) {
      const id = posthogId
      import('posthog-js').then(({ posthog }) => {
        posthog.init(id, posthogConfig)
      })
    }
  }, [])

  React.useEffect(() => {
    function onRouteChangeComplete() {
      if (fathomId) {
        import('fathom-client').then((Fathom) => Fathom.trackPageview())
      }

      if (posthogId) {
        import('posthog-js').then(({ posthog }) => posthog.capture('$pageview'))
      }
    }

    router.events.on('routeChangeComplete', onRouteChangeComplete)

    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete)
    }
  }, [router.events])

  return <Component {...pageProps} />
}
