/**
 * Shared presentation constants.
 *
 * Series colours are fixed per model (never cycled, never reassigned when a
 * model is toggled off) and were validated as a categorical palette on the light
 * chart surface: lightness band, chroma floor, all-pairs CVD separation
 * (worst ΔE 9.2), normal-vision separation (worst ΔE 16.3) and contrast all pass.
 * Aqua sits just under 3:1 against the surface, so every chart that uses it also
 * ships a legend, direct value labels and a table view.
 */

export const MODEL_ORDER = ['tfidf', 'word2vec', 'fasttext', 'hybrid']

export const MODEL_THEME = {
  tfidf: {
    label: 'TF-IDF',
    accent: '#eb6834',
    soft: 'bg-orange-50 text-orange-800 border-orange-200',
    dot: 'bg-[#eb6834]',
    tag: 'Lexical baseline',
  },
  word2vec: {
    label: 'Word2Vec',
    accent: '#1baf7a',
    soft: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-[#1baf7a]',
    tag: 'Dense embedding',
  },
  fasttext: {
    label: 'FastText',
    accent: '#2a78d6',
    soft: 'bg-blue-50 text-blue-800 border-blue-200',
    dot: 'bg-[#2a78d6]',
    tag: 'Sub-word embedding',
  },
  hybrid: {
    label: 'Hybrid',
    accent: '#4a3aa7',
    soft: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dot: 'bg-[#4a3aa7]',
    tag: 'Weighted ensemble',
  },
}

export const CHART_INK = {
  grid: '#e5e8ee',
  axis: '#8290a9',
  text: '#3e485e',
  surface: '#ffffff',
}

export const themeFor = (key) =>
  MODEL_THEME[key] ?? {
    label: key,
    accent: '#61708d',
    soft: 'bg-ink-100 text-ink-700 border-ink-200',
    dot: 'bg-ink-500',
    tag: 'Representation',
  }

export const EXAMPLE_QUERIES = [
  'wireless bluetooth headphones with mic',
  'stainless steel water bottle for gym',
  'noisecancelling earbudz',
  'men running shoes lightweight',
  'cotton kurta for women',
]
