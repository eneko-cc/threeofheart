import { sb } from './sync'

export interface Recipe { title?: string; image?: string; ingredients: string[]; steps: string[]; text?: string; source?: string; intro?: string; serves?: string; time?: string }

/** D'où vient le lien, pour le bouton « Voir sur … » */
export function sourceName(url?: string) {
  if (!url) return ''
  try {
    const h = new URL(url).hostname.replace(/^www\.|^m\./, '')
    if (/tiktok/.test(h)) return 'TikTok'
    if (/instagram/.test(h)) return 'Instagram'
    if (/pinterest|pin\.it/.test(h)) return 'Pinterest'
    if (/youtu/.test(h)) return 'YouTube'
    return h
  } catch { return '' }
}

/** Le premier lien trouvé dans un texte collé (le partage TikTok ajoute souvent du texte autour). */
export function findUrl(text: string) {
  return text.match(/https?:\/\/[^\s"'<>]+/)?.[0]
}

/**
 * Demande à la fonction Supabase `recipe` de lire la page : recette structurée des sites de cuisine,
 * légende des vidéos TikTok, Instagram et des épingles Pinterest. Le texte libre est ensuite découpé ici.
 */
export async function importRecipe(url: string): Promise<Recipe> {
  const { data, error } = await sb.functions.invoke('recipe', { body: { url } })
  if (error || !data) throw error ?? new Error('vide')
  const r = data as Partial<Recipe> & { text?: string }
  let ingredients = clean(r.ingredients ?? [])
  let steps = clean(r.steps ?? [])
  if ((!ingredients.length || !steps.length) && r.text) {
    const p = parseRecipeText(r.text)
    if (!ingredients.length) ingredients = p.ingredients
    if (!steps.length) steps = p.steps
  }
  return { title: r.title?.trim() || undefined, image: r.image || undefined, ingredients, steps, text: r.text, source: r.source || url,
    intro: r.intro || undefined, serves: r.serves || undefined, time: r.time || undefined }
}

const clean = (xs: string[]) => xs.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)

const BULLET = /^\s*(?:[-–—•·▪▫◦●○*✓✔✅☑➡→▶️👉🔸🔹⭐️✨🌿🥄🧂]+|\p{Extended_Pictographic}️?)\s*/u
const NUMBERED = /^\s*(?:[ée]tape\s*)?(\d{1,2})\s*[.):\-–]\s*|^\s*[ée]tape\s*(\d{1,2})\s*:?\s*/i
const QTY = /^\s*(?:\d+[.,/]?\d*|[½¼¾⅓⅔]|une?|deux|trois|quatre|cinq|six|quelques|1\/2)\s*(?:g|gr|kg|ml|cl|dl|l|c\.?\s?[àa]\s?[sc]\.?|cs|cc|cas|cac|cuill|tasses?|verres?|pinc[ée]es?|sachets?|bo[iî]tes?|tranches?|gousses?|brins?|bottes?|filets?|morceaux?|poign[ée]es?|x)?\b/i
const ING_HEAD = /^\s*(?:\p{Extended_Pictographic}️?\s*)*(?:les\s+)?ingr[ée]dients?\b/iu
const STEP_HEAD = /^\s*(?:\p{Extended_Pictographic}️?\s*)*(?:la\s+)?(?:pr[ée]paration|[ée]tapes?|recette|instructions?|m[ée]thode|d[ée]roul[ée])\b/iu
const NOISE = /^#|^@|abonne|follow|lien en bio|link in bio|like|partage|enregistre|save this/i

/**
 * Découpe une légende ou un texte collé en ingrédients et étapes.
 * Repères : titres « Ingrédients » / « Préparation », puces, quantités en début de ligne, étapes numérotées.
 */
export function parseRecipeText(text: string): { ingredients: string[]; steps: string[] } {
  const lines = text
    .replace(/\r/g, '')
    // certaines légendes enchaînent tout sur une ligne avec des puces
    .replace(/\s+(?=[•▪✅👉🔸🔹➡]\s*)/gu, '\n')
    .replace(/\s+(?=\d{1,2}[.)]\s+\p{Lu})/gu, '\n')
    .replace(/\s+(?=(?:ingr[ée]dients?|pr[ée]paration|[ée]tapes?)\s*(?:\(.*?\))?\s*:)/giu, '\n')
    // « Abonne-toi », « lien en bio »… : on retire la phrase, pas toute la ligne
    .replace(/[^.!?\n]*(?:abonne|follow|lien en bio|link in bio|enregistre cette|save this)[^.!?\n]*[.!?]?/gi, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const ingredients: string[] = []
  const steps: string[] = []
  let mode: 'ing' | 'step' | null = null
  for (const raw of lines) {
    if (ING_HEAD.test(raw)) {
      mode = 'ing'
      const rest = raw.replace(ING_HEAD, '').replace(/^[\s:()\d\w]*?:\s*/, '').trim()
      if (rest && rest.includes(',')) ingredients.push(...rest.replace(/\.$/, '').split(/,\s*/))
      continue
    }
    if (STEP_HEAD.test(raw) && raw.length < 40) { mode = 'step'; continue }
    const line = raw.replace(NUMBERED, '').replace(BULLET, '').replace(/#\S+/g, '').trim()
    if (!line || NOISE.test(line)) continue
    const numbered = NUMBERED.test(raw)
    const bullet = BULLET.test(raw)
    if (numbered && (mode !== 'ing' || !QTY.test(line))) { steps.push(line); mode = 'step'; continue }
    if (mode === 'ing') {
      // une phrase longue après la liste, c'est la préparation qui commence
      if (line.length > 70 && /[.!]$/.test(line)) { mode = 'step'; steps.push(line); continue }
      ingredients.push(line)
    } else if (mode === 'step') steps.push(line)
    else if ((QTY.test(line) || bullet) && line.length < 60) ingredients.push(line)
    else if (line.length > 25 && ingredients.length) steps.push(line)
  }
  return { ingredients: clean(ingredients).map(cap), steps: clean(steps).map(cap) }
}

const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase())

/**
 * Un ingrédient tel qu'on l'écrit sur la liste de courses : le produit d'abord, la quantité entre parenthèses.
 * « 200 g de spaghetti » → « Spaghetti (200 g) » ; « 3 œufs » reste « 3 œufs ».
 */
export function toShopping(ing: string) {
  const s = ing.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim()
  const m = s.match(/^((?:\d+[.,/]?\d*|[½¼¾⅓⅔])\s*(?:g|gr|kg|ml|cl|dl|l|c\.?\s?[àa]\s?[sc]\.?|cs|cc|cas|cac|cuill[eè]res?\s+[àa]\s+(?:soupe|caf[ée])|tasses?|verres?|pinc[ée]es?|sachets?|bo[iî]tes?|tranches?|gousses?|brins?|bottes?|filets?|morceaux?|poign[ée]es?)\.?)\s+(?:d['’]\s*|de\s+|des\s+|du\s+)?(.+)$/i)
  if (m) return cap(m[2].trim()) + ` (${m[1].trim()})`
  return cap(s)
}

/** Nom du produit seul, pour savoir s'il est déjà sur la liste de courses. */
export function productKey(s: string) {
  return toShopping(s).replace(/\s*\(.*\)$/, '').replace(/^\d+\s*(x\s*)?/i, '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/s\b/g, '').trim()
}
