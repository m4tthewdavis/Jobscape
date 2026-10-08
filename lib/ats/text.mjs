import * as cheerio from 'cheerio'

/**
 * Converts job-description HTML to readable plain text, keeping paragraph and
 * list breaks. Pass `escaped: true` for APIs (Greenhouse) that entity-escape the HTML.
 */
export function htmlToText(html, { escaped = false, maxLength = 8000 } = {}) {
  if (!html) return undefined
  const source = escaped ? cheerio.load(html, null, false).text() : html
  const $ = cheerio.load(source, null, false)
  $('script, style').remove()
  $('br').replaceWith('\n')
  $('li').each((_, el) => { $(el).prepend('• ').append('\n') })
  $('p, div, h1, h2, h3, h4, h5, h6, tr, ul, ol').each((_, el) => { $(el).append('\n') })
  const text = $.root()
    .text()
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text ? text.slice(0, maxLength) : undefined
}
