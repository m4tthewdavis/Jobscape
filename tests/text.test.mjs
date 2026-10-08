import test from 'node:test'
import assert from 'node:assert/strict'
import { htmlToText } from '../lib/ats/text.mjs'

test('htmlToText keeps paragraph and list structure', () => {
  const text = htmlToText('<p>About us</p><p>We build things.</p><ul><li>Fast</li><li>Fair</li></ul>')
  assert.equal(text, 'About us\nWe build things.\n• Fast\n• Fair')
})

test('htmlToText handles line breaks and entities', () => {
  assert.equal(htmlToText('Line one<br>Line two &amp; more'), 'Line one\nLine two & more')
})

test('htmlToText decodes entity-escaped HTML when asked (Greenhouse)', () => {
  const escaped = '&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;p&gt;Apply now&lt;/p&gt;'
  assert.equal(htmlToText(escaped, { escaped: true }), 'Hello & welcome\nApply now')
})

test('htmlToText drops scripts and styles', () => {
  assert.equal(htmlToText('<style>p{}</style><script>alert(1)</script><p>Safe</p>'), 'Safe')
})

test('htmlToText returns undefined for empty input and truncates long text', () => {
  assert.equal(htmlToText(''), undefined)
  assert.equal(htmlToText(undefined), undefined)
  assert.equal(htmlToText('<p> </p>'), undefined)
  assert.equal(htmlToText('<p>' + 'x'.repeat(50) + '</p>', { maxLength: 10 }).length, 10)
})
