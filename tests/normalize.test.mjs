import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeName, extractDomain } from '../lib/verification/normalize.mjs'

test('normalizeName strips legal suffixes, punctuation, case and diacritics', () => {
  assert.equal(normalizeName('Dr. Squatch, LLC'), 'dr squatch')
  assert.equal(normalizeName('Zevia PBC'), 'zevia')
  assert.equal(normalizeName('Ofélia Company SA'), 'ofelia')
  assert.equal(normalizeName("Ben & Jerry's Homemade, Inc."), 'ben and jerry s homemade')
})

test('normalizeName strips stacked suffixes and a leading "the"', () => {
  assert.equal(normalizeName('Acme Group Ltd'), 'acme group')
  assert.equal(normalizeName('Acme Co. Ltd.'), 'acme')
  assert.equal(normalizeName('The Body Shop'), 'body shop')
})

test('normalizeName never reduces a name to nothing', () => {
  assert.equal(normalizeName('Inc'), 'inc')
  assert.equal(normalizeName('The'), 'the')
  assert.equal(normalizeName(''), '')
  assert.equal(normalizeName(null), '')
})

test('extractDomain handles protocols, www, paths and junk', () => {
  assert.equal(extractDomain('https://www.Example.com/about?x=1'), 'example.com')
  assert.equal(extractDomain('www.b1g1.com'), 'b1g1.com')
  assert.equal(extractDomain('shop.example.co.uk'), 'shop.example.co.uk')
  assert.equal(extractDomain('not a url'), null)
  assert.equal(extractDomain(''), null)
  assert.equal(extractDomain(null), null)
})
