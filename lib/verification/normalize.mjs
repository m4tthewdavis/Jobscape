const LEGAL_SUFFIXES = new Set([
  'inc', 'incorporated', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company',
  'gmbh', 'sa', 'srl', 'bv', 'plc', 'pbc', 'llp', 'lp', 'ag', 'sas', 'sl', 'spa', 'ltda', 'pty', 'nv', 'ab', 'as',
])

export function normalizeName(name) {
  const words = String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) words.pop()
  if (words.length > 1 && words[0] === 'the') words.shift()
  return words.join(' ')
}

export function extractDomain(website) {
  if (!website) return null
  const host = String(website).trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/^www\./, '')
  return host.includes('.') ? host : null
}
