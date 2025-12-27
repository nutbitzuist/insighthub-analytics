# InsightHub Analytics Platform

A comprehensive, privacy-first analytics platform with revenue attribution, heatmaps, and multi-tenant support.

## 🏗️ Project Structure

```
insighthub/
├── apps/
│   ├── web/                 # Next.js 14 Dashboard (Vercel)
│   ├── api/                 # Fastify API Server (Railway)
│   └── worker/              # Background job processor (Railway)
├── packages/
│   ├── shared/              # Shared TypeScript types
│   ├── tracking-script/     # Client-side tracking script
│   └── ui/                  # Shared UI components (future)
└── infrastructure/
    ├── docker/              # Local development setup
    ├── scripts/             # Deployment scripts
    └── migrations/          # Database migrations
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/insighthub.git
cd insighthub
pnpm install
```

### 2. Start Local Databases

```bash
cd infrastructure/docker
docker-compose up -d
```

### 3. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 4. Initialize Databases

```bash
# PostgreSQL migrations
pnpm db:migrate

# Seed initial data (optional)
pnpm db:seed
```

### 5. Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:web    # Dashboard at http://localhost:3000
pnpm dev:api    # API at http://localhost:3001
```

## 📦 Tech Stack

| Component | Technology |
|-----------|------------|
| Dashboard | Next.js 14, React, Tailwind, shadcn/ui |
| API | Fastify, Node.js |
| Analytics DB | ClickHouse |
| App DB | PostgreSQL + Prisma |
| Cache/Queue | Redis + BullMQ |
| Auth | NextAuth.js v5 |
| Tracking Script | Vanilla JS (~4KB) |

## 🔧 Development

### Commands

```bash
pnpm dev              # Start all in dev mode
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm type-check       # TypeScript check
pnpm test             # Run tests
pnpm db:migrate       # Run Prisma migrations
pnpm db:studio        # Open Prisma Studio
```

### Environment Variables

See `.env.example` for all required variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `CLICKHOUSE_HOST` - ClickHouse server
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - Auth encryption key
- `STRIPE_SECRET_KEY` - Stripe API key

## 🌐 Deployment

### Vercel (Dashboard)

1. Connect your GitHub repo to Vercel
2. Set root directory to `apps/web`
3. Add environment variables
4. Deploy

### Railway (API & Worker)

1. Create new Railway project
2. Add PostgreSQL and Redis services
3. Deploy API from `apps/api`
4. Deploy Worker from `apps/worker`
5. Configure environment variables

### ClickHouse Cloud

1. Create ClickHouse Cloud account
2. Create new service
3. Update `CLICKHOUSE_*` env vars

## 📊 Features

### Phase 1 (MVP)
- [x] Core web analytics (visitors, pageviews, sessions)
- [x] Traffic source tracking
- [x] Geographic & device data
- [x] Real-time visitors
- [x] Basic dashboard

### Phase 2
- [ ] Revenue attribution (Stripe)
- [ ] Goals & Funnels
- [ ] Custom events
- [ ] UTM tracking

### Phase 3
- [ ] Click heatmaps
- [ ] Scroll depth visualization
- [ ] Alerts & notifications
- [ ] Public dashboard sharing
- [ ] API access

### Phase 4
- [ ] Multi-tenancy
- [ ] White-label support
- [ ] Team management
- [ ] Billing integration

## 🔒 Privacy & Security

- IP addresses are used for geolocation, then discarded
- No third-party cookies
- GDPR compliant
- Respects Do Not Track
- Data encrypted at rest

## 📄 License

MIT License - see LICENSE file

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

---

Built with ❤️ for indie hackers and makers
