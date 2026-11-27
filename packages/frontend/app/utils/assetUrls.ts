export const ASSET_ORIGIN = 'https://assets.fudapop.com'
export const CARD_ASSET_REVISION = 'v1'

const LEGACY_ASSET_ORIGIN = 'https://ymoriyakbittfgocvxbw.supabase.co'
const RAW_PREFIX = '/storage/v1/object/public/static/'
const RENDER_PREFIX = '/storage/v1/render/image/public/static/'

type AssetNamespace = 'avatars' | 'audio' | 'assets'

export type AssetUrlResolution = {
  url: string
  /** True only when a supported legacy URL was mapped, not for passthrough URLs. */
  recognized: boolean
}

/**
 * Keep object keys literal: decoding or URL normalization could cross namespaces.
 *
 * @param key - Relative object key to check.
 * @returns Whether every segment is an unambiguous public object name.
 * @throws Never.
 */
function isSafeKey(key: string): boolean {
  return key.split('/').every((part) => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part))
}

/**
 * Build non-card URLs without changing audio formats or artwork extensions.
 *
 * @param namespace - Public non-card namespace.
 * @param key - Literal relative object key, including its extension.
 * @returns Direct public asset URL with no query parameters.
 * @throws {TypeError} If the key is empty, encoded, or contains unsafe segments.
 * @example buildAssetUrl('audio', 'bgm/PerituneMaterial_Awayuki.ogg')
 */
export function buildAssetUrl(namespace: AssetNamespace, key: string): string {
  if (!isSafeKey(key)) throw new TypeError('Expected a literal relative asset key')
  return `${ASSET_ORIGIN}/${namespace}/${key}`
}

/**
 * Use design object keys, not metadata names, for canonical WebP card requests.
 *
 * @param design - Literal design folder key, for example `post-card`.
 * @param card - Card name without a filename extension.
 * @returns Versioned public WebP face URL.
 * @throws {TypeError} If either name is empty or is not a single safe segment.
 * @example buildCardFaceUrl('post-card', 'matsu-ni-tsuru')
 */
export function buildCardFaceUrl(design: string, card: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(design) || !/^[a-zA-Z0-9_-]+$/.test(card)) {
    throw new TypeError('Expected literal design and card names')
  }
  return `${ASSET_ORIGIN}/cards/${CARD_ASSET_REVISION}/${design}/${card}.webp`
}

/**
 * Use only for designs with an image back; procedural backs need no asset.
 *
 * @param design - Literal design folder key.
 * @returns Versioned public WebP back URL.
 * @throws {TypeError} If the design is empty or is not a single safe segment.
 * @example buildCardBackUrl('cherry-version')
 */
export function buildCardBackUrl(design: string): string {
  return buildCardFaceUrl(design, 'card-back')
}

/**
 * Resolve saved public storage URLs without a network dependency.
 *
 * Unrecognized inputs are preserved verbatim, including external photos, local
 * fallbacks and canonical URLs. Absent values become an empty display URL.
 * Compatibility preserves extensions; only new card builders prefer WebP.
 * Render support is limited to width=120 and resize=contain, optionally with
 * t/v cache busters. Unknown transformations and signed queries stay untouched.
 * Recognized mappings drop the query but retain fragments (e.g. audio offsets).
 *
 * @param input - Saved URL or absent profile value.
 * @returns URL and whether a supported legacy mapping was recognized.
 * @throws Never for string, null, or undefined inputs, including malformed URLs.
 * @example resolveAssetUrl(profile.avatar).url
 */
export function resolveAssetUrl(input: string | null | undefined): AssetUrlResolution {
  const url = input ?? ''
  const unchanged = { url, recognized: false }

  // Inspect the literal spelling before WHATWG parsing can erase dot segments,
  // backslashes, empty credentials or control characters.
  const literal = /^https:\/\/([^/?#]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i.exec(url)
  if (!literal || /[\s\\%]/.test(literal[1]! + (literal[2] ?? ''))) return unchanged
  if (literal[1]!.includes('@') || /\p{Cc}/u.test(url)) return unchanged

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return unchanged
  }
  if (
    parsed.origin !== LEGACY_ASSET_ORIGIN ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== literal[2]
  ) {
    return unchanged
  }

  // Even a public-looking path must not turn a signed URL into a public request.
  for (const key of parsed.searchParams.keys()) {
    if (/token|signature|authorization|^x-amz-|^x-goog-/i.test(key)) return unchanged
  }

  const isRender = parsed.pathname.startsWith(RENDER_PREFIX)
  const prefix = isRender ? RENDER_PREFIX : RAW_PREFIX
  if (!parsed.pathname.startsWith(prefix)) return unchanged

  const path = parsed.pathname.slice(prefix.length)
  if (!isSafeKey(path)) return unchanged
  const [namespace, ...key] = path.split('/')
  if (!key.length) return unchanged
  if (namespace !== 'cards' && !['avatars', 'audio', 'assets'].includes(namespace!)) {
    return unchanged
  }

  if (isRender) {
    if (namespace !== 'cards') return unchanged
    const query = parsed.searchParams
    if (
      query.getAll('width').length !== 1 ||
      query.get('width') !== '120' ||
      query.getAll('resize').length !== 1 ||
      query.get('resize') !== 'contain' ||
      [...query.keys()].some((key) => !['width', 'resize', 't', 'v'].includes(key))
    ) {
      return unchanged
    }
  }

  const destination = namespace === 'cards' ? `cards/${CARD_ASSET_REVISION}/${key.join('/')}` : path
  return { url: `${ASSET_ORIGIN}/${destination}${parsed.hash}`, recognized: true }
}
