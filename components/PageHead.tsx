import Head from 'next/head'

import type * as types from '@/lib/types'
import * as config from '@/lib/config'
import { getSocialImageUrl } from '@/lib/get-social-image-url'

export function PageHead({
  site,
  title,
  description,
  pageId,
  image,
  url,
  isArticle,
  articleTags,
  articleSection,
  datePublished,
  dateModified
}: types.PageProps & {
  title?: string
  description?: string
  image?: string
  url?: string
  isArticle?: boolean
  articleTags?: string[]
  articleSection?: string
  datePublished?: string
  dateModified?: string
}) {
  const rssFeedUrl = `${config.host}/feed`

  title = title ?? site?.name
  description = description ?? site?.description

  const socialImageUrl = getSocialImageUrl(pageId) || image
  const authorUrl = config.linkedin
    ? `https://www.linkedin.com/in/${config.linkedin}`
    : undefined

  return (
    <Head>
      <meta charSet='utf-8' />
      <meta httpEquiv='Content-Type' content='text/html; charset=utf-8' />
      <meta
        name='viewport'
        content='width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover'
      />

      <meta name='mobile-web-app-capable' content='yes' />
      <meta name='apple-mobile-web-app-status-bar-style' content='black' />

      <meta
        name='theme-color'
        media='(prefers-color-scheme: light)'
        content='#fefffe'
        key='theme-color-light'
      />
      <meta
        name='theme-color'
        media='(prefers-color-scheme: dark)'
        content='#2d3439'
        key='theme-color-dark'
      />

      <meta name='robots' content='index,follow' />
      <meta
        property='og:type'
        content={isArticle ? 'article' : 'website'}
      />

      {site && (
        <>
          <meta property='og:site_name' content={site.name} />
          <meta property='twitter:domain' content={site.domain} />
        </>
      )}

      {config.twitter && (
        <meta name='twitter:creator' content={`@${config.twitter}`} />
      )}

      {description && (
        <>
          <meta name='description' content={description} />
          <meta property='og:description' content={description} />
          <meta name='twitter:description' content={description} />
        </>
      )}

      {socialImageUrl ? (
        <>
          <meta name='twitter:card' content='summary_large_image' />
          <meta name='twitter:image' content={socialImageUrl} />
          <meta property='og:image' content={socialImageUrl} />
        </>
      ) : (
        <meta name='twitter:card' content='summary' />
      )}

      {url && (
        <>
          <link rel='canonical' href={url} />
          <meta property='og:url' content={url} />
          <meta property='twitter:url' content={url} />
        </>
      )}

      <link
        rel='alternate'
        type='application/rss+xml'
        href={rssFeedUrl}
        title={site?.name}
      />

      <meta property='og:title' content={title} />
      <meta name='twitter:title' content={title} />
      <title>{title}</title>

      {/* Article-specific Open Graph tags */}
      {isArticle && (
        <>
          {authorUrl && (
            <meta property='article:author' content={authorUrl} />
          )}
          <meta
            property='article:section'
            content={articleSection || 'Technology'}
          />
          {datePublished && (
            <meta property='article:published_time' content={datePublished} />
          )}
          {dateModified && (
            <meta property='article:modified_time' content={dateModified} />
          )}
          {articleTags?.map((tag) => (
            <meta key={tag} property='article:tag' content={tag} />
          ))}
        </>
      )}

      {/* Structured data — NewsArticle schema for article pages */}
      {isArticle && (
        <script type='application/ld+json'>
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            '@id': `${url}#BlogPosting`,
            mainEntityOfPage: url,
            url,
            headline: title,
            name: title,
            description,
            ...(datePublished && { datePublished }),
            ...(dateModified && { dateModified }),
            author: [
              {
                '@type': 'Person',
                name: config.author,
                ...(authorUrl && { url: authorUrl })
              }
            ],
            ...(socialImageUrl && { image: [socialImageUrl] }),
            ...(articleSection && { articleSection }),
            ...(articleTags?.length && { keywords: articleTags.join(', ') })
          })}
        </script>
      )}
    </Head>
  )
}
