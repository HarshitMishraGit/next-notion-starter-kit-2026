import ky from 'ky'
import {
  type Block,
  type ExtendedRecordMap,
  type PageBlock
} from 'notion-types'
import {
  defaultMapImageUrl,
  getBlockIcon,
  getBlockValue,
  isUrl
} from 'notion-utils'
import pMap from 'p-map'

import {
  cloudinary,
  getPublicId,
  isCloudinaryConfigured,
  isCloudinaryUrl
} from './cloudinary-server'
import { domain } from './config'
import { db } from './db'

type BlockImageTarget = {
  blockId: string
  block: Block
  sourceUrl: string
  applyFns: Array<(secureUrl: string) => void>
}

type CloudinaryCacheEntry = {
  secureUrl: string
  notionVersion?: number
}

function shouldLocalizeImageUrl(url: string): boolean {
  if (!url || isCloudinaryUrl(url) || url.startsWith('data:')) {
    return false
  }

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/images') ||
    url.startsWith('/image') ||
    url.startsWith('attachment:')
  ) {
    return true
  }

  return false
}

function isExternalHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

function isNotionFileUrl(url: string): boolean {
  return (
    url.includes('secure.notion-static.com') ||
    url.includes('prod-files-secure') ||
    url.includes('attachment:') ||
    url.includes('file.notion.so') ||
    url.includes('notion.so/image') ||
    url.includes('notion-static.com') ||
    url.includes('amazonaws.com') ||
    url.startsWith('/images') ||
    url.startsWith('/image')
  )
}

function isSignedNotionUrl(url: string): boolean {
  return (
    url.includes('X-Amz-Signature') ||
    url.includes('X-Amz-Credential') ||
    url.includes('token=')
  )
}

function getUploadSourceUrl(
  block: Block,
  recordMap: ExtendedRecordMap,
  rawUrl?: string | null
): string | undefined {
  const signedUrl = recordMap.signed_urls?.[block.id]

  if (rawUrl && isExternalHttpUrl(rawUrl) && !isNotionFileUrl(rawUrl)) {
    return rawUrl
  }

  if (signedUrl && shouldLocalizeImageUrl(signedUrl)) {
    return signedUrl
  }

  if (!rawUrl) {
    return undefined
  }

  if (rawUrl.startsWith('/images') || rawUrl.startsWith('/image')) {
    return defaultMapImageUrl(rawUrl, block)
  }

  if (
    rawUrl.startsWith('attachment:') ||
    rawUrl.includes('secure.notion-static.com')
  ) {
    return signedUrl || defaultMapImageUrl(rawUrl, block)
  }

  return rawUrl
}

function registerTarget(
  targets: Map<string, BlockImageTarget>,
  block: Block,
  rawUrl: string | undefined | null,
  recordMap: ExtendedRecordMap,
  apply: (secureUrl: string) => void
) {
  const url = getUploadSourceUrl(block, recordMap, rawUrl)

  if (!url || !shouldLocalizeImageUrl(url)) {
    return
  }

  const existing = targets.get(block.id)

  if (existing) {
    existing.applyFns.push(apply)

    if (isSignedNotionUrl(url) || url.length > existing.sourceUrl.length) {
      existing.sourceUrl = url
    }

    return
  }

  targets.set(block.id, {
    blockId: block.id,
    block,
    sourceUrl: url,
    applyFns: [apply]
  })
}

function collectBlockImageTargets(
  recordMap: ExtendedRecordMap
): BlockImageTarget[] {
  const targets = new Map<string, BlockImageTarget>()

  for (const blockId of Object.keys(recordMap.block || {})) {
    const block = getBlockValue(recordMap.block[blockId])
    if (!block) {
      continue
    }

    if (block.type === 'image') {
      const rawSource = block.properties?.source?.[0]?.[0]

      registerTarget(targets, block, rawSource, recordMap, (secureUrl) => {
        if (!recordMap.signed_urls) {
          recordMap.signed_urls = {}
        }

        recordMap.signed_urls[block.id] = secureUrl

        if (block.properties?.source?.[0]) {
          block.properties.source[0][0] = secureUrl
        } else {
          block.properties = {
            ...block.properties,
            source: [[secureUrl]]
          }
        }
      })
    }

    const pageCover = (block.format as PageBlock['format'])?.page_cover
    registerTarget(targets, block, pageCover, recordMap, (secureUrl) => {
      block.format = {
        ...block.format,
        page_cover: secureUrl
      }
    })

    const bookmarkCover = (block.format as any)?.bookmark_cover
    registerTarget(targets, block, bookmarkCover, recordMap, (secureUrl) => {
      block.format = {
        ...block.format,
        bookmark_cover: secureUrl
      }
    })

    const bookmarkIcon = (block.format as any)?.bookmark_icon
    registerTarget(targets, block, bookmarkIcon, recordMap, (secureUrl) => {
      block.format = {
        ...block.format,
        bookmark_icon: secureUrl
      }
    })

    const pageIcon = getBlockIcon(block, recordMap)
    if (pageIcon && isUrl(pageIcon)) {
      registerTarget(targets, block, pageIcon, recordMap, (secureUrl) => {
        block.format = {
          ...block.format,
          page_icon: secureUrl
        }
      })
    }
  }

  return Array.from(targets.values())
}

function getCachedNotionVersion(
  context: Record<string, unknown> | undefined
): number | undefined {
  const custom = context?.custom as Record<string, string> | undefined
  const version = custom?.notion_version

  if (!version) {
    return undefined
  }

  const parsed = Number(version)
  return Number.isFinite(parsed) ? parsed : undefined
}

async function getCachedCloudinaryUrl(
  blockId: string
): Promise<CloudinaryCacheEntry | null> {
  const cacheKey = `cloudinary:${blockId}`

  try {
    return (await db.get(cacheKey)) ?? null
  } catch (err: any) {
    console.warn(`redis error get "${cacheKey}"`, err.message)
    return null
  }
}

async function setCachedCloudinaryUrl(
  blockId: string,
  entry: CloudinaryCacheEntry
) {
  const cacheKey = `cloudinary:${blockId}`

  try {
    await db.set(cacheKey, entry)
  } catch (err: any) {
    console.warn(`redis error set "${cacheKey}"`, err.message)
  }
}

async function uploadImageToCloudinary(
  sourceUrl: string,
  publicId: string,
  target: BlockImageTarget
): Promise<string> {
  const response = await ky.get(sourceUrl, {
    headers: {
      'User-Agent': `Mozilla/5.0 (compatible; harshit-mishra-portfolio/1.0; +https://${domain})`
    },
    timeout: 30_000
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`

  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    overwrite: true,
    resource_type: 'image',
    context: `block_id=${target.blockId}|notion_version=${target.block.version ?? ''}`
  })

  return result.secure_url
}

async function resolveCloudinaryUrl(
  target: BlockImageTarget
): Promise<string | null> {
  const publicId = getPublicId(target.blockId)
  const notionVersion = target.block.version

  const cached = await getCachedCloudinaryUrl(target.blockId)
  if (
    cached?.secureUrl &&
    (notionVersion === undefined ||
      cached.notionVersion === undefined ||
      cached.notionVersion === notionVersion)
  ) {
    return cached.secureUrl
  }

  try {
    const existing = await cloudinary.api.resource(publicId, {
      resource_type: 'image'
    })

    const existingVersion = getCachedNotionVersion(
      existing.context as Record<string, unknown> | undefined
    )

    if (
      notionVersion === undefined ||
      existingVersion === undefined ||
      existingVersion === notionVersion
    ) {
      const secureUrl = existing.secure_url as string

      await setCachedCloudinaryUrl(target.blockId, {
        secureUrl,
        notionVersion: existingVersion ?? notionVersion
      })

      return secureUrl
    }
  } catch (err: any) {
    if (err?.error?.http_code !== 404) {
      console.warn('cloudinary resource lookup failed', publicId, err.message)
    }
  }

  try {
    const secureUrl = await uploadImageToCloudinary(
      target.sourceUrl,
      publicId,
      target
    )

    await setCachedCloudinaryUrl(target.blockId, {
      secureUrl,
      notionVersion
    })

    console.log('cloudinary upload', { publicId, blockId: target.blockId })

    return secureUrl
  } catch (err: any) {
    console.warn(
      'cloudinary upload failed',
      publicId,
      target.sourceUrl,
      err.message
    )
    return null
  }
}

export async function localizeRecordMapImages(
  recordMap: ExtendedRecordMap
): Promise<ExtendedRecordMap> {
  if (!isCloudinaryConfigured()) {
    return recordMap
  }

  const targets = collectBlockImageTargets(recordMap)

  if (!targets.length) {
    return recordMap
  }

  await pMap(
    targets,
    async (target) => {
      const secureUrl = await resolveCloudinaryUrl(target)

      if (!secureUrl) {
        return
      }

      for (const apply of target.applyFns) {
        apply(secureUrl)
      }
    },
    { concurrency: 6 }
  )

  return recordMap
}
