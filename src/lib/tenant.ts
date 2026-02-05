/**
 * Multi-tenancy utilities for subdomain-based school isolation
 */

/**
 * Extract school slug from hostname
 * @param host - The hostname (e.g., "school1.thestai.com")
 * @returns The school slug or null if on main domain
 */
export function getSchoolSlugFromHost(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0]

  // Split hostname into parts
  const parts = hostname.split('.')

  // Check if it's a subdomain (e.g., school1.thestai.com has 3+ parts)
  // Exclude 'www' as a valid school slug
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0].toLowerCase()
  }

  return null
}

/**
 * Validate school slug format
 * @param slug - The slug to validate
 * @returns True if valid
 */
export function isValidSlug(slug: string): boolean {
  // Slug must be:
  // - 3-50 characters
  // - Only lowercase letters, numbers, and hyphens
  // - Start with a letter
  // - Not end with a hyphen
  const slugRegex = /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/
  return slugRegex.test(slug)
}

/**
 * Generate a slug from school name
 * @param name - The school name
 * @returns A valid slug
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .slice(0, 50) // Limit length
}

/**
 * Build the full URL for a school's subdomain
 * @param slug - The school slug
 * @param baseDomain - The base domain (e.g., "thestai.com")
 * @returns The full URL (e.g., "https://school1.thestai.com")
 */
export function buildSchoolUrl(slug: string, baseDomain: string): string {
  return `https://${slug}.${baseDomain}`
}

// Reserved slugs that cannot be used by schools
export const RESERVED_SLUGS = [
  'www',
  'api',
  'admin',
  'app',
  'dashboard',
  'help',
  'support',
  'docs',
  'blog',
  'status',
  'mail',
  'email',
  'ftp',
  'cdn',
  'assets',
  'static',
  'media',
]

/**
 * Check if a slug is reserved
 * @param slug - The slug to check
 * @returns True if reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase())
}
