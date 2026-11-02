import assert from 'node:assert/strict';
import { parseArgs, normalizeUrl, siteUrl, feedUrl, selectTargetTab } from './hermes-social.mjs';
assert.deepEqual(parseArgs(['screenshot', 'https://www.reddit.com/']), { command: 'screenshot', url: 'https://www.reddit.com/' });
assert.throws(() => parseArgs(['screenshot']), /URL/);
assert.deepEqual(parseArgs(['video', 'https://www.instagram.com/reel/abc/']), { command: 'video', url: 'https://www.instagram.com/reel/abc/', frames: 4 });
assert.deepEqual(parseArgs(['video', 'https://www.youtube.com/watch?v=abc', '--frames', '3']), { command: 'video', url: 'https://www.youtube.com/watch?v=abc', frames: 3 });
assert.throws(() => parseArgs(['video', 'https://evil.example/video']), /supported site/);
assert.throws(() => parseArgs(['video', 'https://www.youtube.com/watch?v=abc', '--frames', '7']), /1 and 5/);

assert.equal(selectTargetTab([
  { type: 'page', url: 'about:blank', id: 'old' },
  { type: 'page', url: 'https://www.reddit.com/search/?q=python', id: 'target' },
], 'https://www.reddit.com/search/?q=python')?.id, 'target');
assert.equal(selectTargetTab([{ type: 'page', url: 'about:blank', id: 'old' }], 'https://www.reddit.com/search/?q=python'), null);

assert.deepEqual(parseArgs(['search', '--site', 'reddit', 'python jobs']), {
  command: 'search', site: 'reddit', query: 'python jobs'
});
assert.deepEqual(parseArgs(['feed', '--site', 'x']), { command: 'feed', site: 'x' });
assert.deepEqual(parseArgs(['read', 'https://www.youtube.com/watch?v=abc']), { command: 'read', url: 'https://www.youtube.com/watch?v=abc' });
assert.equal(siteUrl('reddit', 'search', 'python').startsWith('https://www.reddit.com/search/'), true);
assert.equal(feedUrl('youtube'), 'https://www.youtube.com');
assert.equal(feedUrl('instagram'), 'https://www.instagram.com/');
assert.equal(feedUrl('tiktok'), 'https://www.tiktok.com/foryou');
assert.equal(siteUrl('tiktok', 'search', 'cats'), 'https://www.tiktok.com/search?q=cats');
assert.deepEqual(parseArgs(['feed', '--site', 'tiktok']), { command: 'feed', site: 'tiktok' });
assert.equal(normalizeUrl('https://www.tiktok.com/@user/video/12345'), 'https://www.tiktok.com/@user/video/12345');
assert.throws(() => normalizeUrl('https://tiktok.com.evil.example/video'), /supported site/);
assert.equal(siteUrl('instagram', 'search', 'cats'), 'https://www.instagram.com/explore/search/keyword/?q=cats');
assert.deepEqual(parseArgs(['feed', '--site', 'instagram']), { command: 'feed', site: 'instagram' });
assert.equal(normalizeUrl('https://www.instagram.com/p/example/'), 'https://www.instagram.com/p/example/');
assert.equal(normalizeUrl('https://www.threads.com/following/'), 'https://www.threads.com/following/');
assert.throws(() => normalizeUrl('https://evil.example/'), /supported site/);
assert.throws(() => parseArgs(['search', '--site', 'threads']), /query/);
console.log('self-test passed');
