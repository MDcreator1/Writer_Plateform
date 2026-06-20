# Security and Anti-Piracy Documentation

## What Is Implemented

- HTTP-only JWT session cookies
- Password hashing with bcrypt
- Prisma data model for email verification, OTP, sessions, devices, wallets, purchases, reading sessions, admin logs, and suspicious activity
- Encrypted chapter storage helper using AES-256-GCM
- Secure content endpoint that checks chapter purchase/free access before decrypting one chapter
- Short-lived chapter access token generation
- Visible watermark payload with user, session, and timestamp
- Invisible fingerprint marker embedding
- Client-side deterrence for context menu, copy, cut, drag, print, and common developer shortcuts
- No-store cache headers for chapter API responses
- Rate-limit stubs for comments and newsletter

## Important Reality Check

Browser content can never be perfectly protected from a determined attacker once it is rendered. This platform uses layered deterrence, server-side access control, and forensic traceability. Treat it as DRM-inspired protection, not absolute DRM.

## Recommended Production Hardening

- Move rate limiting to Redis or an edge WAF
- Use provider-native webhook signature verification for Razorpay, Stripe, and PayPal
- Add CAPTCHA to auth, comments, newsletter, and checkout initiation
- Enforce MFA for admins
- Add strict RBAC checks to every admin route
- Store encrypted chapter keys in a managed KMS
- Use device trust scoring before paid chapter delivery
- Alert on rapid unlocks, unusual devices, excessive chapter requests, and repeated copy/screenshot attempts
- Reconcile payment ledgers daily against provider exports
- Keep security event retention long enough for leak investigations

## Leak Investigation Flow

1. Extract visible watermark, if present.
2. Scan leaked text for zero-width fingerprint markers.
3. Match marker to `Purchase.fingerprint` and `ReadingSession.watermark`.
4. Review `UnlockEvent`, `ReadingSession`, `Device`, and `SuspiciousActivity`.
5. Suspend or challenge the account if evidence is strong.
