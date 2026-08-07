/** Client-side image compress for check-in proof photos (Canvas → JPEG). */

const DEFAULT_MAX_EDGE = 1280
const DEFAULT_QUALITY = 0.75
const HARD_MAX_BYTES = 5 * 1024 * 1024
const SOFT_MAX_BYTES = 1.5 * 1024 * 1024

export class CompressImageError extends Error {
  constructor(
    message: string,
    public readonly code: 'decode' | 'too_large' | 'empty',
  ) {
    super(message)
    this.name = 'CompressImageError'
  }
}

type DecodedImage = {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  close?: () => void
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
  })
}

function loadViaHtmlImage(file: File): Promise<DecodedImage> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => {
      URL.revokeObjectURL(url)
      const width = el.naturalWidth || el.width
      const height = el.naturalHeight || el.height
      if (!width || !height) {
        reject(new Error('decode'))
        return
      }
      resolve({
        width,
        height,
        draw: (ctx, w, h) => ctx.drawImage(el, 0, 0, w, h),
      })
    }
    el.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    el.src = url
  })
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        close: () => bitmap.close(),
      }
    } catch {
      /* fall through to <img> */
    }
  }
  return loadViaHtmlImage(file)
}

function isLikelyHeic(file: File): boolean {
  const name = (file.name || '').toLowerCase()
  const type = (file.type || '').toLowerCase()
  return (
    type.includes('heic') ||
    type.includes('heif') ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

/**
 * Resize + JPEG-encode for upload. Falls back to the original file when
 * decode fails but the file is already an allowed type under 5MB.
 */
export async function compressImageForUpload(
  file: File,
  opts?: { maxEdge?: number; quality?: number },
): Promise<File> {
  if (!file || file.size <= 0) {
    throw new CompressImageError('没有选到图片', 'empty')
  }

  const maxEdge = opts?.maxEdge ?? DEFAULT_MAX_EDGE
  let quality = opts?.quality ?? DEFAULT_QUALITY

  try {
    const decoded = await decodeImage(file)
    let w = decoded.width
    let h = decoded.height
    const scale = Math.min(1, maxEdge / Math.max(w, h, 1))
    w = Math.max(1, Math.round(w * scale))
    h = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      decoded.close?.()
      throw new Error('no-ctx')
    }
    decoded.draw(ctx, w, h)
    decoded.close?.()

    let blob = await canvasToBlob(canvas, quality)
    while (blob && blob.size > SOFT_MAX_BYTES && quality > 0.5) {
      quality = Math.round((quality - 0.1) * 100) / 100
      blob = await canvasToBlob(canvas, quality)
    }

    if (!blob || blob.size <= 0) throw new Error('empty-blob')
    if (blob.size > HARD_MAX_BYTES) {
      throw new CompressImageError(
        '照片还是太大了，请换一张或离远一点再拍',
        'too_large',
      )
    }

    const base = (file.name || 'proof').replace(/\.[^.]+$/, '') || 'proof'
    return new File([blob], `${base}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch (e) {
    if (e instanceof CompressImageError) throw e

    if (isLikelyHeic(file)) {
      throw new CompressImageError(
        '这张照片格式暂不支持。请在相册里选「照片」或另存为 JPG 后再传',
        'decode',
      )
    }

    const allowed =
      /^image\/(jpeg|png|webp|gif)$/i.test(file.type) ||
      /\.(jpe?g|png|webp|gif)$/i.test(file.name || '')
    if (allowed && file.size <= HARD_MAX_BYTES) {
      return file
    }

    if (file.size > HARD_MAX_BYTES) {
      throw new CompressImageError(
        '照片太大了（超过 5MB），请换一张小一点的',
        'too_large',
      )
    }

    throw new CompressImageError(
      '读不了这张图。请换 JPG/PNG，或用系统相机拍一张再试',
      'decode',
    )
  }
}
