# PharmEasy Deployment (Vercel + Render + Neon)

This repo is now prepared for the split deployment model:
- Frontend on Vercel
- Backend on Render
- Database on Neon

## 1. Configure Neon

1. Create a Neon project and database.
2. Copy the pooled Postgres connection string.
3. Put it in backend env as `DATABASE_URL`.

## 2. Deploy Backend to Render

Render is configured through [render.yaml](render.yaml).

1. In Render, create a new Blueprint service from this repo.
2. Select the backend service (`pharmeasy-backend`).
3. Fill all `sync: false` env vars in Render dashboard using [Backend/.env.example](Backend/.env.example) as reference.
   - You can copy from your private local file: [Backend/.env.render](Backend/.env.render)
4. Deploy.
5. Confirm health endpoint works:
   - `https://pharmeasy-backend-k20t.onrender.com/api/health`

## 3. Deploy Frontend to Vercel

Vercel is configured by [Frontend/vercel.json](Frontend/vercel.json).

1. In Vercel, import this repo.
2. Set Root Directory to `Frontend`.
3. Add env vars from [Frontend/.env.example](Frontend/.env.example):
   - `VITE_API_URL=https://pharmeasy-backend-k20t.onrender.com/api`
   - `VITE_SOCKET_URL=https://pharmeasy-backend-k20t.onrender.com` (optional but recommended)
4. Deploy.

## 4. Update Backend CORS Variables

Set these values in Render after you know your Vercel domain:
- `FRONTEND_URL=https://pharm-easy-sigma.vercel.app`
- `CORS_ORIGIN=https://pharm-easy-sigma.vercel.app`
- `CORS_ORIGIN_PATTERNS=https://pharm-easy-sigma-*.vercel.app` (optional for preview deployments)

## 5. Final Smoke Test

1. Open frontend URL from Vercel.
2. Test login/register flow.
3. Test API status via UI and direct backend URL.
4. Test a chat/Socket.IO flow to confirm realtime works.

## Notes

- Backend now supports comma-separated origins and wildcard origin patterns for CORS.
- Backend defaults to `0.0.0.0` host in production if `HOST` is not set.
- Prisma migration is run during Render build (`prisma migrate deploy`).
