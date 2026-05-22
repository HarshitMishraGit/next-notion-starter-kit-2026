import { type Block } from 'notion-types'
import { defaultMapImageUrl } from 'notion-utils'

import { isCloudinaryUrl } from './cloudinary-url'
import { defaultPageCover, defaultPageIcon } from './config'

export const mapImageUrl = (url: string | undefined, block: Block) => {
  if (url === defaultPageCover || url === defaultPageIcon) {
    return url
  }

  if (isCloudinaryUrl(url)) {
    return url
  }

  return defaultMapImageUrl(url, block)
}
