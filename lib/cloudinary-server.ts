import { v2 as cloudinary } from 'cloudinary'

import { isCloudinaryEnvConfigured } from './cloudinary-url'
import { getEnv } from './get-config-value'

export const cloudinaryCloudName = getEnv('CLOUDINARY_CLOUD_NAME', null)
export const cloudinaryApiKey = getEnv('CLOUDINARY_API_KEY', null)
export const cloudinaryApiSecret = getEnv('CLOUDINARY_API_SECRET', null)
export const cloudinaryNotionFolder =
  getEnv('CLOUDINARY_NOTION_FOLDER', null) || 'notion'

export function isCloudinaryConfigured(): boolean {
  return isCloudinaryEnvConfigured()
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: cloudinaryCloudName!,
    api_key: cloudinaryApiKey!,
    api_secret: cloudinaryApiSecret!,
    secure: true
  })
}

// Configured instance must be exported after cloudinary.config().
// eslint-disable-next-line unicorn/prefer-export-from -- side-effect config before export
export { cloudinary }

export function getPublicId(blockId: string): string {
  const id = blockId.replaceAll('-', '')
  return `${cloudinaryNotionFolder}/${id}`
}

export { isCloudinaryUrl } from './cloudinary-url'
