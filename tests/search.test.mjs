import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeSearch } from '../lib/search.mjs'

test('sanitizeSearch removes PostgREST filter and ilike metacharacters', () => {
  assert.equal(sanitizeSearch('a,b)'), 'a b')
  assert.equal(sanitizeSearch(')or(id.eq.1'), 'or id.eq.1')
  assert.equal(sanitizeSearch('100%_sure*"quoted"\\'), '100 sure quoted')
})

test('sanitizeSearch trims, collapses whitespace and tolerates empty input', () => {
  assert.equal(sanitizeSearch('  react   developer '), 'react developer')
  assert.equal(sanitizeSearch(undefined), '')
  assert.equal(sanitizeSearch(null), '')
})
