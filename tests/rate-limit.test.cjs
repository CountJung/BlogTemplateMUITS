const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
require('tsx/cjs');
const { getClientIp } = require('../lib/client-ip.ts');
const { createRateLimiter, allowRequest } = require('../lib/rate-limit.ts');
const original = { ...process.env };
afterEach(() => { for (const key of ['TRUST_PROXY_HOPS', 'TRUSTED_PROXY_IPS', 'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_VIEW_MAX']) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } });
const request = (peer, forwarded) => ({ socket: { remoteAddress: peer }, headers: { 'x-forwarded-for': forwarded, 'x-real-ip': '203.0.113.99' } });
test('default ignores spoofed forwarding and normalizes mapped IPv4', () => {
 delete process.env.TRUST_PROXY_HOPS;
 assert.equal(getClientIp(request('::ffff:127.0.0.1', '203.0.113.8')), '127.0.0.1');
});
test('requires each configured proxy, selects the nearest untrusted client, rejects malformed chains', () => {
 process.env.TRUST_PROXY_HOPS = '2'; process.env.TRUSTED_PROXY_IPS = '127.0.0.1,10.0.0.2';
 assert.equal(getClientIp(request('127.0.0.1', '203.0.113.9,198.51.100.1,10.0.0.2')), '198.51.100.1');
 for (const header of ['198.51.100.1,10.0.0.3','invalid,10.0.0.2','10.0.0.2', 'a'.repeat(1025)]) assert.equal(getClientIp(request('127.0.0.1',header)), '127.0.0.1');
 assert.equal(getClientIp(request('192.0.2.2','198.51.100.1,10.0.0.2')), '192.0.2.2');
});
test('bounded buckets reject rotation at capacity and recover after expiry', () => {
 let time = 0; const consume = createRateLimiter(() => time,2);
 assert.equal(consume('a',2,1000).allowed,true); assert.equal(consume('a',2,1000).allowed,true);
 assert.deepEqual(consume('a',2,1000),{allowed:false,retryAfter:1});
 assert.equal(consume('b',2,1000).allowed,true); assert.equal(consume('c',2,1000).allowed,false);
 time = 1000; assert.equal(consume('c',2,1000).allowed,true);
});
test('HTTP helper shares limits across spoofed headers and returns no-store 429 with retry', () => {
 process.env.RATE_LIMIT_VIEW_MAX = '1'; process.env.RATE_LIMIT_WINDOW_MS = '1000';
 const res = { headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;} };
 assert.equal(allowRequest(request('192.0.2.45','1.1.1.1'),res,'VIEW'),true);
 assert.equal(allowRequest(request('192.0.2.45','2.2.2.2'),res,'VIEW'),false);
 assert.equal(res.code,429);assert.equal(res.headers['Retry-After'],'1');assert.match(res.headers['Cache-Control'],/no-store/);
});

test('invalid configuration falls back to enabled default limits', () => {
 process.env.RATE_LIMIT_VIEW_MAX = '0'; process.env.RATE_LIMIT_WINDOW_MS = 'invalid';
 const res = { setHeader(){},status(n){this.code=n;return this;},json(){} };
 for(let i=0;i<240;i++) assert.equal(allowRequest(request('192.0.2.46',''),res,'VIEW'),true);
 assert.equal(allowRequest(request('192.0.2.46',''),res,'VIEW'),false);assert.equal(res.code,429);
});

test('candidate CSP is opt-in report-only and keeps enforcement stable without external reporting', () => {
 const { securityHeaders } = require('../lib/security-headers.ts');
 const normal=securityHeaders(), candidate=securityHeaders(true);
 assert.equal(normal.some(h=>h.key==='Content-Security-Policy-Report-Only'),false);
 assert.deepEqual(candidate.slice(0,normal.length),normal);
 const policy=candidate.find(h=>h.key==='Content-Security-Policy-Report-Only').value;
 assert.match(policy,/script-src 'self'/);assert.doesNotMatch(policy,/report-uri|report-to/);
});
