// Text cleanup for agent-written stories. Pure functions with no imports, so
// the server-rendered SEO (api/_lib/studio.js) cleans headlines and summaries
// exactly as the pages do.

// Source feeds sometimes hand us HTML entities in titles/summaries (e.g.
// "&#124;", "UK&#8217;s", "&amp;"). Decode them so headlines read cleanly.
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', deg: '°', eacute: 'é',
}
export function decodeEntities(s) {
  if (!s || typeof s !== 'string' || s.indexOf('&') === -1) return s || ''
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, code) ? NAMED_ENTITIES[code] : m
  })
}

// Older approved rows carry raw CMS artifacts in their summaries
// ("Published on: …", "3 min read", "Listen to this article"). Strip them at
// display time; new agent-written summaries are already clean.
export function stripArtifacts(s) {
  if (!s) return ''
  return s
    .replace(/Published on:\s*\d{1,2}\s+\w+\s+\d{4},?\s*\d{1,2}:\d{2}\s*[ap]m/gi, ' ')
    .replace(/Updated:\s*\w+\s+\d{1,2},\s*\d{4}[^.]*?(IST)?/gi, ' ')
    .replace(/\b\d+\s*min read\b/gi, ' ')
    .replace(/\bListen to this article\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
