# Authentication Review

## Current State

The app supports credential signup and login with password hashing, HTTP-only session cookies, logout, and a profile page.

Current protected flows:

- `POST /api/connections`
- `GET /api/connections`
- `POST /api/connections/{id}/test`
- `POST /api/usage/track`
- `POST /api/workflows`
- `POST /api/templates/{id}/install`

## Implemented Auth Flow

1. User signs up with first name, last name, email, and password.
2. Password is hashed with PBKDF2-SHA256 before storage.
3. Login creates an opaque session token.
4. Only the token hash is stored in `user_sessions`.
5. The raw session token is stored in an HTTP-only same-site cookie.
6. Protected API routes derive `user.id` from the session cookie.

## Production Hardening Still Needed

- Add CSRF protection for cookie-authenticated form posts.
- Add reset token tables.
- Add email verification delivery.
- Add route-level RBAC checks.
- Add audit logs for connection create/test and workflow activation.

## Connection Security

Connection credentials are encrypted with AES-256-GCM using `CONNECTION_ENCRYPTION_KEY`. This key must be stored only as a server secret and rotated with a planned re-encryption workflow.
