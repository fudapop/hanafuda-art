const AVATARS = [
  // Flat
  // 'flat-crane',
  // 'flat-warbler',
  // 'flat-curtain',
  // 'flat-bridge',
  // 'flat-butterflies',
  // 'flat-boar',
  // 'flat-moon',
  // 'flat-deer',
  // 'flat-phoenix',

  // Origami
  // 'origami-crane',
  // 'origami-warbler',
  // 'origami-curtain',
  // 'origami-cuckoo',
  // 'origami-bridge',
  'origami-butterflies',
  'origami-boar',
  'origami-moon',
  'origami-deer',
  // 'origami-rainman',
  // 'origami-phoenix',

  // Gamblers
  'gamblers-may',
  'gamblers-june',
  'gamblers-september',
  'gamblers-october',
] as const

type AvatarName = (typeof AVATARS)[number]

type AvatarStyle = 'flat' | 'origami' | 'gamblers'

type Avatar = {
  name: AvatarName
  style: AvatarStyle
  url: string
}

export const useAvatar = () => {
  const config = useRuntimeConfig()
  const bucketUrl = `${config.public.supabaseUrl}/storage/v1/object/public/static/avatars`

  const getAvatarUrl = (name: AvatarName): string => {
    return `${bucketUrl}/${name}.webp`
  }

  const listAvatarUrls = (): string[] => {
    return AVATARS.map(getAvatarUrl)
  }

  const getRandomAvatarUrl = (filterFn?: (arg0: string) => boolean): string => {
    const fromList = listAvatarUrls()
    if (filterFn) {
      return getRandom(fromList.filter(filterFn))
    }
    return getRandom(fromList)
  }

  const getAvatar = (name: AvatarName): Avatar => {
    return {
      name,
      style: name.split('-')[0] as AvatarStyle,
      url: getAvatarUrl(name),
    }
  }

  const listAvatars = (style?: AvatarStyle): Avatar[] => {
    const avatars = AVATARS.map(getAvatar)
    if (style) {
      return avatars.filter((a) => a.style === style)
    }
    return avatars
  }

  const getRandomAvatar = (filterFn?: (arg0: Avatar) => boolean): Avatar => {
    if (filterFn) {
      const fromList = listAvatars()
      return getRandom(fromList.filter(filterFn))
    }
    const name = getRandom(Array.from(AVATARS))
    return getAvatar(name)
  }

  return {
    getAvatarUrl,
    listAvatarUrls,
    getRandomAvatarUrl,
    getAvatar,
    listAvatars,
    getRandomAvatar,
  }
}
