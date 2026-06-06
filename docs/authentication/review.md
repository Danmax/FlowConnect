# Authentication Review

## Current State

The app now requires explicit user context for write APIs through `x-flowconnect-user-id`. This removes demo-user fallbacks, but it is not a complete authentication system yet.

Current protected flows:

- `POST /api/connections`
- `GET /api/connections`
- `POST /api/connections/{id}/test`
- `POST /api/usage/track`
- `POST /api/workflows`
- `POST /api/templates/{id}/install`

## Required Production Auth Flow

1. User signs up with first name, last name, email, password, and role.
2. Password is hashed with bcrypt or Argon2 before storage.
3. Email verification sets `users.email_verified_at`.
4. Login creates a secure HTTP-only session.
5. API routes read the authenticated session server-side and derive `user.id`.
6. Role checks gate admin and builder actions.
7. Password reset sends a signed, expiring reset token.

## Immediate Gaps

- Replace `x-flowconnect-user-id` with server-side session lookup.
- Add CSRF protection for cookie-authenticated form posts.
- Add password hashing and reset token tables.
- Add route-level RBAC checks.
- Add audit logs for connection create/test and workflow activation.

## Connection Security

Connection credentials are encrypted with AES-256-GCM using `CONNECTION_ENCRYPTION_KEY`. This key must be stored only as a server secret and rotated with a planned re-encryption workflow.
