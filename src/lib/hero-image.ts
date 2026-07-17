import type { CSSProperties } from 'react'

export interface HeroImageSettings {
  zoom: number
  x: number
  y: number
  height: number
  textStroke?: number
  overlayOpacity?: number
  hideContentOnFocus?: boolean
}

export function defaultHeroImageSettings(height = 400): HeroImageSettings {
  return {
    zoom: 1,
    x: 50,
    y: 50,
    height,
    textStroke: 1,
    overlayOpacity: 55,
    hideContentOnFocus: false,
  }
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function resolveHeroImageSettings(
  settings: Partial<HeroImageSettings> | null | undefined,
  fallbackHeight = 400,
): HeroImageSettings {
  const defaults = defaultHeroImageSettings(fallbackHeight)
  return {
    zoom: clamp(settings?.zoom ?? defaults.zoom, 1, 3),
    x: clamp(settings?.x ?? defaults.x, 0, 100),
    y: clamp(settings?.y ?? defaults.y, 0, 100),
    height: clamp(settings?.height ?? defaults.height, 160, 1200),
    textStroke: clamp(settings?.textStroke ?? defaults.textStroke ?? 1, 0, 4),
    overlayOpacity: clamp(settings?.overlayOpacity ?? defaults.overlayOpacity ?? 55, 0, 90),
    hideContentOnFocus: settings?.hideContentOnFocus ?? defaults.hideContentOnFocus ?? false,
  }
}

export function heroBackgroundImageStyle(settings: HeroImageSettings, imageUrl: string): CSSProperties {
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: `${settings.x}% ${settings.y}%`,
    backgroundRepeat: 'no-repeat',
    transform: `scale(${settings.zoom})`,
    transformOrigin: `${settings.x}% ${settings.y}%`,
  }
}

export function heroOverlayGradient(settings: HeroImageSettings, variant: 'intro' | 'landing' = 'intro') {
  const opacity = clamp(settings.overlayOpacity ?? 55, 0, 90) / 100
  if (variant === 'landing') {
    return `linear-gradient(180deg, rgba(0,0,0,${Math.min(0.9, opacity + 0.12)}) 0%, rgba(0,0,0,${opacity}) 100%)`
  }
  return `linear-gradient(to top, rgba(0,0,0,${Math.min(0.92, opacity + 0.25)}) 0%, rgba(0,0,0,${opacity}) 48%, rgba(0,0,0,${Math.max(0.12, opacity - 0.28)}) 100%)`
}

export function heroTextOutlineStyle(settings: HeroImageSettings, scale = 1): CSSProperties {
  const stroke = clamp(settings.textStroke ?? 1, 0, 4) * scale
  const shadow = '0 2px 8px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.8)'

  if (stroke <= 0) {
    return { textShadow: shadow }
  }

  return {
    WebkitTextStroke: `${stroke}px rgba(2,6,23,0.72)`,
    textShadow: shadow,
  } as CSSProperties
}
