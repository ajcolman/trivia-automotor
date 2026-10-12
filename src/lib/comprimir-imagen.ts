// Author: Angel Colman
/**
 * Comprime una imagen en el navegador, antes de subirla.
 *
 * Dos motivos. Uno, el peso: un banner de 4 MB salido de una cámara tarda en
 * cargar y además los previsualizadores de enlaces -- WhatsApp entre ellos --
 * directamente descartan las imágenes grandes, así que la tarjeta del evento
 * sale sin foto. Dos, los metadatos: una foto de celular viaja con fecha,
 * modelo y muchas veces coordenadas GPS, y eso no tiene por qué quedar
 * publicado en la web.
 *
 * Redibujar la imagen en un canvas resuelve las dos cosas a la vez: lo que
 * sale del canvas son píxeles y nada más, sin un solo bloque de metadatos.
 *
 * Nunca agranda ni devuelve algo más pesado que el original: si comprimir no
 * mejora, se sube el archivo tal cual.
 */

/** Resultado, para poder contarle al usuario qué pasó. */
export interface ImagenComprimida {
  archivo: File
  bytesAntes: number
  bytesDespues: number
  /** False cuando no se tocó: vectorial, animada, o ya estaba bien. */
  comprimida: boolean
}

/**
 * Formatos que se dejan intactos.
 *
 * El SVG es vectorial: pasarlo por un canvas lo convertiría en píxeles y
 * perdería lo que lo hace útil. El GIF puede estar animado -- los sprites de
 * los juegos lo están -- y el canvas se quedaría con un solo cuadro.
 */
const INTOCABLES = ['image/svg+xml', 'image/gif']

/** Lado máximo por defecto, si quien llama no dice otra cosa. */
const LADO_MAXIMO = 2000

function soportaWebp(): boolean {
  try {
    return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

function cambiarExtension(nombre: string, tipo: string): string {
  const ext = tipo === 'image/webp' ? 'webp' : tipo === 'image/png' ? 'png' : 'jpg'
  return `${nombre.replace(/\.[^.]+$/, '')}.${ext}`
}

/**
 * Comprime si conviene.
 *
 * @param file       El archivo elegido por el usuario.
 * @param ladoMaximo Lado mayor permitido, en píxeles. Solo achica.
 */
export async function comprimirImagen(
  file: File,
  ladoMaximo: number = LADO_MAXIMO,
): Promise<ImagenComprimida> {
  const sinTocar: ImagenComprimida = {
    archivo: file,
    bytesAntes: file.size,
    bytesDespues: file.size,
    comprimida: false,
  }

  if (INTOCABLES.includes(file.type) || !file.type.startsWith('image/')) return sinTocar
  if (typeof createImageBitmap !== 'function') return sinTocar

  try {
    // `from-image` aplica la rotación que la foto trae en el EXIF. Hay que
    // pedirla: al descartar los metadatos, una foto de celular sacada en
    // vertical quedaría acostada.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
    const ancho = Math.max(1, Math.round(bitmap.width * escala))
    const alto = Math.max(1, Math.round(bitmap.height * escala))

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return sinTocar }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, ancho, alto)
    bitmap.close()

    // WebP mantiene la transparencia y pesa bastante menos que PNG o JPEG.
    // Sin soporte se cae a PNG cuando el original podía tener canal alfa, y a
    // JPEG cuando seguro no lo tiene: un PNG de foto pesa más que el original.
    const tipo = soportaWebp()
      ? 'image/webp'
      : file.type === 'image/png'
        ? 'image/png'
        : 'image/jpeg'

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, tipo, 0.82),
    )
    if (!blob) return sinTocar

    // Si no mejoró, no vale la pena cambiar el archivo... salvo que el
    // original trajera metadatos, que es justamente lo que queremos sacar.
    // Por eso se compara con un margen y no con el tamaño exacto.
    if (blob.size >= file.size * 0.95 && escala === 1) return sinTocar

    return {
      archivo: new File([blob], cambiarExtension(file.name, tipo), {
        type: tipo,
        lastModified: Date.now(),
      }),
      bytesAntes: file.size,
      bytesDespues: blob.size,
      comprimida: true,
    }
  } catch {
    // Un formato que el navegador no sabe decodificar se sube como vino.
    return sinTocar
  }
}

/** `1,2 MB`, `340 KB`. */
export function pesoLegible(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  return `${Math.round(bytes / 1024)} KB`
}
