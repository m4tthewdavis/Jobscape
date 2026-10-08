import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { PROVIDERS, PROVIDER_NAMES, RateLimitError, validSlug, candidateSlugs, boardMatches } from '../lib/ats/providers.mjs'
import { mockFetch } from './helpers.mjs'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

test('registry lists the supported platforms', () => {
  assert.deepEqual(PROVIDER_NAMES, ['greenhouse', 'workable', 'recruitee', 'smartrecruiters'])
})

test('every provider treats 404 as "no board"', async () => {
  for (const [name, p] of Object.entries(PROVIDERS)) {
    mockFetch({ '': { status: 404 } })
    assert.equal(await p.boardName('nope'), null, name)
  }
})

test('every provider surfaces 429 as RateLimitError with Retry-After', async () => {
  for (const [name, p] of Object.entries(PROVIDERS)) {
    mockFetch({ '': { status: 429, headers: { 'retry-after': '86256' } } })
    await assert.rejects(
      () => p.boardName('busy'),
      (e) => e instanceof RateLimitError && e.retryAfter === 86256 && e.host.length > 0,
      name
    )
  }
  mockFetch({ '': { status: 429 } })
  await assert.rejects(() => PROVIDERS.greenhouse.boardName('x'), (e) => e instanceof RateLimitError && e.retryAfter === null)
})

test('other server errors are plain errors, not rate limits', async () => {
  mockFetch({ '': { status: 503 } })
  await assert.rejects(() => PROVIDERS.greenhouse.boardName('x'), (e) => !(e instanceof RateLimitError) && /HTTP 503/.test(e.message))
})

test('greenhouse: board name and jobs (escaped description decoded)', async () => {
  mockFetch({
    '/boards/bombas/jobs': { body: { jobs: [{ title: 'Designer', absolute_url: 'https://boards.greenhouse.io/bombas/jobs/1', location: { name: 'NYC' }, content: '&lt;p&gt;Make socks&lt;/p&gt;', first_published: '2026-01-02T00:00:00Z' }] } },
    '/boards/bombas': { body: { name: 'Bombas' } },
  })
  assert.equal(await PROVIDERS.greenhouse.boardName('bombas'), 'Bombas')
  assert.deepEqual(await PROVIDERS.greenhouse.fetchJobs('bombas'), [
    { title: 'Designer', url: 'https://boards.greenhouse.io/bombas/jobs/1', location: 'NYC', description: 'Make socks', postedAt: '2026-01-02T00:00:00Z' },
  ])
})

test('workable: name known even with zero jobs; jobs map remote and place', async () => {
  mockFetch({ 'love-cocoa': { body: { name: 'Love Cocoa', jobs: [] } } })
  assert.equal(await PROVIDERS.workable.boardName('love-cocoa'), 'Love Cocoa')
  assert.deepEqual(await PROVIDERS.workable.fetchJobs('love-cocoa'), [])

  mockFetch({ 'acme': { body: { name: 'Acme', jobs: [
    { title: 'Dev', url: 'https://apply.workable.com/acme/j/A1/', telecommuting: true, description: '<p>Hi</p>', published_on: '2026-02-01' },
    { title: 'Ops', shortlink: 'https://apply.workable.com/j/B2', city: 'London', country: 'United Kingdom', created_at: '2026-02-02' },
  ] } } })
  const jobs = await PROVIDERS.workable.fetchJobs('acme')
  assert.equal(jobs[0].location, 'Remote')
  assert.equal(jobs[0].description, 'Hi')
  assert.equal(jobs[1].location, 'London, United Kingdom')
  assert.equal(jobs[1].url, 'https://apply.workable.com/j/B2')
})

test('recruitee: name only from an open offer; empty board is unverifiable', async () => {
  mockFetch({ 'bunq.recruitee.com': { body: { offers: [{ company_name: 'bunq', title: 'Engineer', careers_url: 'https://bunq.recruitee.com/o/eng', location: 'Amsterdam', description: '<p>Build</p>', published_at: '2026-03-01' }] } } })
  assert.equal(await PROVIDERS.recruitee.boardName('bunq'), 'bunq')
  assert.deepEqual(await PROVIDERS.recruitee.fetchJobs('bunq'), [
    { title: 'Engineer', url: 'https://bunq.recruitee.com/o/eng', location: 'Amsterdam', description: 'Build', postedAt: '2026-03-01' },
  ])
  mockFetch({ 'quiet.recruitee.com': { body: { offers: [] } } })
  assert.equal(await PROVIDERS.recruitee.boardName('quiet'), null)
})

test('smartrecruiters: empty result means unknown company; fetchJobs paginates', async () => {
  mockFetch({ 'companies/ghost/': { body: { totalFound: 0, content: [] } } })
  assert.equal(await PROVIDERS.smartrecruiters.boardName('ghost'), null)

  const posting = (id) => ({ id, name: `Job ${id}`, company: { identifier: 'HubAustralia', name: 'Hub Australia' }, releasedDate: '2026-10-08', location: { fullLocation: 'Melbourne, VIC, Australia' } })
  const calls = mockFetch({
    'offset=0': { body: { totalFound: 150, content: Array.from({ length: 100 }, (_, i) => posting(`a${i}`)) } },
    'offset=100': { body: { totalFound: 150, content: Array.from({ length: 50 }, (_, i) => posting(`b${i}`)) } },
  })
  const jobs = await PROVIDERS.smartrecruiters.fetchJobs('hubaustralia')
  assert.equal(jobs.length, 150)
  assert.equal(calls.length, 2)
  assert.equal(jobs[0].url, 'https://jobs.smartrecruiters.com/HubAustralia/a0')
  assert.equal(jobs[0].location, 'Melbourne, VIC, Australia')
})

test('fetchJobs throws when the board has disappeared', async () => {
  mockFetch({ '': { status: 404 } })
  for (const name of PROVIDER_NAMES) await assert.rejects(() => PROVIDERS[name].fetchJobs('gone'), /not found/, name)
})

test('validSlug accepts DNS-label slugs only', () => {
  for (const ok of ['bombas', 'love-cocoa', 'a1']) assert.equal(validSlug(ok), true, ok)
  for (const bad of ['-bad', 'bad-', 'a', 'has space', 'dot.ted', 'UPPER', '']) assert.equal(validSlug(bad), false, bad)
})

test('candidateSlugs combines domain label and name variants, dropping invalid ones', () => {
  assert.deepEqual(candidateSlugs({ domain: 'goaxial.com', normalized_name: 'axial' }).sort(), ['axial', 'goaxial'])
  assert.deepEqual(candidateSlugs({ domain: 'love-cocoa.co.uk', normalized_name: 'love cocoa' }).sort(), ['love-cocoa', 'lovecocoa'])
  assert.deepEqual(candidateSlugs({ domain: null, normalized_name: 'x' }), [])
})

test('boardMatches requires an exact normalized name match', () => {
  assert.equal(boardMatches('Coursera, Inc.', 'coursera'), true)
  assert.equal(boardMatches('Coursera Learning', 'coursera'), false)
  assert.equal(boardMatches(null, 'coursera'), false)
})
