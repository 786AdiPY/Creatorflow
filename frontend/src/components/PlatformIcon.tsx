import type { Platform } from '../types'

const LABEL: Record<Platform, string> = {
  youtube: 'YT',
  instagram: 'IG',
  tiktok: 'TT',
}

const COLOR: Record<Platform, string> = {
  youtube: 'bg-red-600',
  instagram: 'bg-pink-600',
  tiktok: 'bg-black',
}

export function PlatformIcon({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${COLOR[platform]}`}
      title={platform}
    >
      {LABEL[platform]}
    </span>
  )
}
