function standaloneSvg(
  container: HTMLElement,
): { markup: string; width: number; height: number } | null {
  const svg = container.querySelector('svg')
  if (!svg) return null
  const rect = svg.getBoundingClientRect()
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('width', `${rect.width}`)
  clone.setAttribute('height', `${rect.height}`)
  return {
    markup: new XMLSerializer().serializeToString(clone),
    width: rect.width,
    height: rect.height,
  }
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadSvg(container: HTMLElement, filename: string): boolean {
  const svg = standaloneSvg(container)
  if (!svg) return false
  save(new Blob([svg.markup], { type: 'image/svg+xml' }), filename)
  return true
}

export async function downloadPng(
  container: HTMLElement,
  filename: string,
  scale = 2,
): Promise<boolean> {
  const svg = standaloneSvg(container)
  if (!svg) return false
  const image = new Image()
  const url = URL.createObjectURL(new Blob([svg.markup], { type: 'image/svg+xml' }))
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('could not rasterize the formula'))
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(svg.width * scale)
    canvas.height = Math.ceil(svg.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return false
    context.scale(scale, scale)
    context.drawImage(image, 0, 0, svg.width, svg.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return false
    save(blob, filename)
    return true
  } finally {
    URL.revokeObjectURL(url)
  }
}
