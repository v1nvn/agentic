import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { encodeShare, shareUrl, statusLine } from '../src/share.js';

describe('encodeShare', () => {
  // Verified against the live viewer: encodeMarkdownForShare("Hi").
  it('matches the viewer token for "Hi"', () => {
    expect(encodeShare('Hi')).toBe('eJzzyAQAAPsAsg');
  });

  it('emits unpadded base64url', () => {
    const token = encodeShare('# Heading\n\nbody text with + / = characters');
    expect(token).not.toMatch(/[+/=]/);
  });

  it('round-trips through zlib inflate', () => {
    const md = '# Title\n\n- one\n- two\n';
    const b64 = encodeShare(md)
      .replaceAll('-', '+')
      .replaceAll('_', '/');
    expect(inflateSync(Buffer.from(b64, 'base64')).toString('utf8')).toBe(md);
  });
});

describe('shareUrl', () => {
  it('builds an edit-mode share URL off the configured base', () => {
    process.env.MD_VIEWER_URL = 'https://md.example.com/';
    expect(shareUrl('Hi')).toBe('https://md.example.com/#share=eJzzyAQAAPsAsg&edit=1');
    delete process.env.MD_VIEWER_URL;
  });

  it('builds a read-only share URL without the edit flag', () => {
    process.env.MD_VIEWER_URL = 'https://md.example.com/';
    expect(shareUrl('Hi', true)).toBe('https://md.example.com/#share=eJzzyAQAAPsAsg');
    delete process.env.MD_VIEWER_URL;
  });
});

describe('statusLine', () => {
  it('reports open + copy, open, copy, and neither', () => {
    expect(statusLine(true, true)).toBe('Opened in Markdown-Viewer (link copied).');
    expect(statusLine(true, false)).toBe('Opened in Markdown-Viewer.');
    expect(statusLine(false, true)).toBe('Markdown-Viewer link copied to clipboard.');
    expect(statusLine(false, false)).toBe('Markdown-Viewer link ready.');
  });
});
