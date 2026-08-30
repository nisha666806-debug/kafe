# Oshi Forom — PostgreSQL backend (Phase 1)

This backend is intentionally **separate from the current Firebase frontend**. The existing app is not modified by this phase.

## Goal
Build a PostgreSQL + Node.js API replacement safely, then migrate feature-by-feature after testing.

## Database
Run `sql/001_init.sql` against PostgreSQL.

## Local run
1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. `npm install`
3. `npm start`
4. Check `GET /api/health`.

## Current API
- `GET /api/health`
- `GET /api/orders?status=active|paid|cancelled` with `x-restaurant-id`
- `POST /api/orders` with `x-restaurant-id`
- WebSocket: `/ws?restaurant=<restaurant-id>`

## Safety rule
Do not point production users at this backend yet. Phase 1 only establishes the database/API foundation. Firebase remains the source of truth until migration and end-to-end testing are complete.
