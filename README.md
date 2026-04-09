# Punch List App

A web-based punch list management application for construction projects, starting with restaurants but expandable to other building types.

## Features

- **Photo-first punch walk capture** - Quickly capture photos of issues on-site
- **Multi-project support** - Manage multiple projects with different building types
- **Trade & sub-trade management** - Organize items by trade
- **Area-based organization** - Group items by project area
- **Status workflow** - Draft → Open → Pending → Accepted/Rejected
- **Export capabilities** - Export to PDF or CSV
- **Role-based access** - Admin and viewer roles

## Tech Stack

- **Frontend**: Next.js 14 (React)
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (via Prisma ORM)
- **Auth**: NextAuth.js
- **File Storage**: Local filesystem
- **PDF Export**: jsPDF

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Edit .env with your database URL and secrets
   DATABASE_URL="postgresql://user:password@localhost:5432/punchlist"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. Initialize the database:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Demo Account

After seeding, you can login with:
- Username: `demo`
- Password: `demo123`

## Project Types (Expansion Roadmap)

1. ✅ Restaurant (Phase 1 - Complete)
2. Office (Phase 2)
3. Retail (Phase 3)
4. Hotel (Phase 4)
5. Warehouse (Phase 5)
6. Residential (Phase 6)

## Deployment

### Railway (Recommended)

1. Create a Railway account at railway.app
2. Create a new project and add PostgreSQL
3. Connect your GitHub repository
4. Set environment variables in Railway dashboard
5. Deploy

### Docker

```bash
docker build -t punch-list-app .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  punch-list-app
```

## API Routes

- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth authentication
- `GET/POST /api/projects` - List/create projects
- `GET/PATCH/DELETE /api/projects/[id]` - Project CRUD
- `GET/POST /api/punch-items` - List/create punch items
- `GET/PATCH/DELETE /api/punch-items/[id]` - Punch item CRUD
- `GET/POST /api/trades` - List/create trades
- `GET/POST /api/areas` - List/create areas
- `GET /api/project-types` - List project types
- `POST /api/upload` - Upload photos

## License

MIT
