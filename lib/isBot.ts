// Recognizes crawlers and automated clients by their User-Agent, so they don't
// inflate the per-listing "Views" dealers see. Not a security control -- a
// bot can lie about its User-Agent -- just a filter for the honest majority
// (search engines, AI crawlers, SEO tools, uptime/speed testers, headless
// browsers, and scripting libraries). A missing User-Agent is treated as a
// bot, since every real browser sends one.
const BOT_PATTERN = new RegExp([
  'bot', 'crawl', 'spider', 'slurp', 'archiver', 'scraper', 'fetcher',
  'facebookexternalhit', 'bingpreview', 'embedly', 'quora link preview', 'whatsapp', 'telegram', 'discord', 'slack',
  'headlesschrome', 'phantomjs', 'puppeteer', 'playwright', 'selenium', 'electron',
  'lighthouse', 'pagespeed', 'gtmetrix', 'pingdom', 'uptime', 'statuscake', 'site24x7',
  'python-requests', 'python-urllib', 'aiohttp', 'httpx', 'curl', 'wget', 'go-http-client', 'java/', 'okhttp',
  'axios', 'node-fetch', 'undici', 'libwww', 'httpclient', 'scrapy', 'postman',
  'ahrefs', 'semrush', 'mj12', 'dotbot', 'petalbot', 'yandex', 'baiduspider', 'bytespider',
  'gptbot', 'chatgpt-user', 'claudebot', 'claude-web', 'anthropic', 'ccbot', 'perplexity', 'amazonbot', 'applebot',
].map(s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|'), 'i');

// Real phone brands whose model names contain "bot" (e.g. "CUBOT X30").
const BOT_LOOKALIKE_BRANDS = /cubot/gi;

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || !userAgent.trim()) return true;
  return BOT_PATTERN.test(userAgent.replace(BOT_LOOKALIKE_BRANDS, ''));
}
