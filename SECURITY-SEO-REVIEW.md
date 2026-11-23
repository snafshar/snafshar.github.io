# MyPhotoStories — SEO and security review

Reviewed 23 November 2026. Public site: https://snafshar.github.io/. Owner dashboard: https://snafshar.github.io/cntrladmin/.

## Changes made

- Added a real, self-hosted image CAPTCHA to password sign-in and initial password setup. Six random characters are rendered into a raster PNG, with a separately generated spoken-audio option. The answer is not present as text in the page, image metadata or JSON response.
- Verification happens on the server. Challenges expire after three minutes, are bound to a keyed hash of the edge-reported client IP, and are consumed on a valid-format attempt, including an incorrect answer. Stored answers are keyed hashes. Reusing or guessing a challenge cannot skip password verification.
- Kept salted scrypt password hashing, the separate runtime pepper, hashed session tokens, eight-hour session expiry, explicit logout revocation, server-side owner authorization and private-gallery access checks.
- Kept sign-in limits of eight attempts per client / 15 minutes and a global ceiling. Added CAPTCHA issuance limits of 30 per client / 15 minutes and a global ceiling. Rate-limit keys do not contain raw IP addresses.
- Removed the retired GitHub-to-ChatGPT authorization/exchange endpoints. The GitHub dashboard has username/password sign-in only. Managed authentication on the separate backend host remains a platform-controlled boundary.
- Added a dashboard frame guard and a no-referrer policy for its document. Backend API responses use no-store, nosniff, noindex and a restrictive permissions policy.
- Added complete public HTML snapshots, individual article URLs, unique descriptions, canonical links, Open Graph metadata, image descriptions and BlogPosting structured data. The public site has robots.txt and sitemap.xml; private dashboard paths are excluded.
- Added ten original, editable photography guides of approximately 450 words each. Their illustrations reuse the existing journal gallery and are identified as illustrative; no new personal travel history or ownership of those images is claimed. Existing posts and owner settings are preserved.
- Added a GitHub workflow to refresh published HTML and the sitemap hourly, and on manual dispatch. It reads only public content. Removed or unpublished article snapshots are pruned at the next successful refresh. Live page rendering still checks the backend immediately.

## Verification

The automated suite covers CAPTCHA validity, expiry, IP binding, incorrect answers and replay; private-route impersonation; password setup, hashing and throttling; session and media revocation; CSRF/origin checks; output escaping; upload validation; publication/draft separation; metadata and static export; preservation of owner edits during content seeding; and the existing newspaper composition features. All 46 checks passed before deployment.

Both the production-only and complete npm dependency audits reported zero known advisories at review time. This describes the registry's results on that date, not a guarantee against undiscovered issues.

## Remaining limits and operating notes

1. **CAPTCHA is an additional obstacle, not MFA or a guarantee against automation.** OCR, speech recognition, human solving and distributed traffic can defeat CAPTCHA systems. A managed bot-protection service would require the owner's provider configuration. There is no third-party CAPTCHA account or tracking script in this implementation.
2. **GitHub Pages response headers are host-controlled.** The application supplies a CSP through HTML and rejects embedded dashboard execution, but cannot configure per-site HTTP frame-ancestors, X-Frame-Options or Permissions-Policy headers on snafshar.github.io. Stronger header-level enforcement requires hosting that exposes those controls. Backend API responses can and do set their own headers.
3. **The browser holds its owner session in sessionStorage.** This is necessary for the current cross-origin static frontend / API arrangement. A future same-origin backend could use HttpOnly session cookies. Avoid adding untrusted scripts; a future script injection could otherwise expose a browser session.
4. **Static search snapshots have publication latency.** Readers with JavaScript receive current public content from the backend. Search/social snapshots and raw HTML are refreshed by successful GitHub builds, normally on the hourly schedule, which GitHub may delay. Unpublishing is not a promise to erase copies already fetched, cached or indexed elsewhere. The next snapshot removes the site's obsolete exported page.
5. **No search ranking or indexing guarantee.** Canonicals, readable HTML and a sitemap make the site easier to crawl. Search Console ownership, submission and third-party indexing decisions remain outside this review.
6. This was an application source review, dependency audit, integration test run and deployment smoke check. It was not an independent penetration test, a promise that every attack is prevented, or a legal/privacy compliance certification.
