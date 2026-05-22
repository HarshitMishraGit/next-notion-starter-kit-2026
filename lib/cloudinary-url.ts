export function isCloudinaryUrl(url: string | undefined): boolean {
  return !!url?.includes('res.cloudinary.com')
}

function hasCloudinaryEnvVars(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

export function isCloudinaryEnvConfigured(): boolean {
  return hasCloudinaryEnvVars()
}
