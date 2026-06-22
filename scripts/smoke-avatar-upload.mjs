/**
 * Prod smoke: login + POST /api/upload/avatar with a tiny JPEG.
 * Env: SMOKE_PARENT_EMAIL, SMOKE_PARENT_PASSWORD, BASE
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE;
const EMAIL = process.env.SMOKE_PARENT_EMAIL;
const PASSWORD = process.env.SMOKE_PARENT_PASSWORD;

if (!EMAIL || !PASSWORD || !BASE) {
  console.error('Set BASE, SMOKE_PARENT_EMAIL and SMOKE_PARENT_PASSWORD');
  process.exit(1);
}

// 1x1 red JPEG
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  const cookieBtn = page.locator('button:has-text("Godkänn alla")');
  if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) await cookieBtn.click();
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('#submitBtn');
  await page.waitForURL(/\/(dashboard|family|onboarding)/, { timeout: 45000 });

  const result = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const blob = new Blob([arr], { type: 'image/jpeg' });
    const fd = new FormData();
    fd.append('image', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }), 'avatar.jpg');

    const auth = window.Auth;
    if (!auth || !auth.ensureCsrfToken) return { error: 'no Auth' };
    await auth.ensureCsrfToken();
    const csrf = auth.getCsrfToken();
    const res = await fetch('/api/upload/avatar', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': csrf },
      body: fd,
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }, TINY_JPEG_B64);

  console.log('Upload result:', JSON.stringify(result, null, 2));
  await browser.close();

  if (!result.url && !result.body?.url) {
    console.error('FAIL: no url returned');
    process.exit(1);
  }
  console.log('OK:', result.body?.url || result.url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
