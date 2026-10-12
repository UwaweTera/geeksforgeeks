# GeekPath backend

Node.js + Express + MySQL API.

1. Install [MySQL](https://dev.mysql.com/downloads/mysql/) and start the service.
2. Copy `.env.example` to `.env` and set `DB_USER` / `DB_PASSWORD`.
3. Install and run:

```bash
npm install
npm run dev
```

The server creates the `geekpath` database, tables, and seed data on first start.

API: http://localhost:4000/api/health

Demo users:

- student@geekpath.dev / password123
- admin@geekpath.dev / admin123
