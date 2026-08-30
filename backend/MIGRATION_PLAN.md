# Migration plan

1. Keep Firebase production unchanged.
2. Create PostgreSQL schema and health-check API.
3. Add a one-time Firebase -> PostgreSQL exporter with validation counts.
4. Migrate orders first and compare totals/status/table mapping.
5. Add transactional inventory operations.
6. Add auth/session layer with hashed passwords; never copy plaintext passwords.
7. Add reports using SQL aggregates.
8. Add WebSocket event delivery and reconnect handling.
9. Run dual-read comparison in a test environment.
10. Switch one test device, then one role, then all devices.
11. Only after successful acceptance tests disable Firebase writes.
