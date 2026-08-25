# Studio ERP - Complete Studio Management System

A production-ready, scalable, secure Studio Management ERP/CRM System for photography, videography, events, wedding, audio, and equipment-rental studios.

## Features

- **Authentication & Authorization** - JWT-based with refresh tokens, RBAC
- **Dashboard** - Real-time KPIs, charts, upcoming events
- **Customer CRM** - Full customer profiles with history, bookings, payments
- **Leads Management** - Lead tracking with conversion analytics
- **Booking Management** - Multi-service, multi-equipment bookings with conflict detection
- **Event Management** - Calendar view, event scheduling
- **Equipment Management** - Inventory tracking, availability checking, utilization reports
- **Supplier Management** - External supplier and rental tracking
- **Invoicing** - Professional invoices with PDF, multi-payment support
- **Payments** - Deposit tracking, partial payments, multiple methods
- **Expenses** - Categorized expense tracking with booking-level attribution
- **Financial Reports** - Revenue, profit, expenses, outstanding payments
- **Marketing** - Campaign management, customer segmentation, WhatsApp integration architecture
- **Public Landing Page** - Lead capture with UTM tracking
- **Audit Logs** - Full action tracking
- **Notifications** - Real-time system notifications
- **Bilingual** - Arabic (RTL) + English (LTR)
- **AI Ready** - Analytics endpoints for future AI agent integration

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js (modular architecture)
- PostgreSQL + Prisma ORM
- JWT Authentication
- Helmet, CORS, Rate Limiting

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- React Router
- Recharts
- i18next (Arabic/English)

### Infrastructure
- Docker + Docker Compose
- PostgreSQL 16
- Nginx (frontend)

## Installation

### Prerequisites
- Node.js 20+
- npm or yarn
- PostgreSQL 16+ (only needed for Docker Compose / production — local dev uses SQLite)

### Backend Setup

```bash
cd backend
cp ../.env.example .env
# Edit .env with youcr database credentials
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Docker Setup

```bash
# From project root
docker-compose up -d
```

## Environment Variables

See `.env.example` for all required variables.

## Database Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed data
npm run prisma:seed

# Production migration
npm run prisma:migrate:prod

# Prisma Studio (GUI)
npm run prisma:studio
```

## Default Credentials

- **Admin:** admin@studio.com / Admin@123
- **Manager:** manager@studio.com / Manager@123

## API Documentation

Base URL: `http://localhost:3000/api/v1`

### Authentication
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Current user

### CRM
- `GET /customers` - List customers
- `POST /customers` - Create customer
- `GET /customers/:id` - Customer profile
- `PATCH /customers/:id` - Update customer
- `DELETE /customers/:id` - Soft delete

### Leads
- `GET /leads` - List leads
- `POST /leads` - Create lead
- `PATCH /leads/:id` - Update lead
- `POST /leads/:id/convert` - Convert to customer

### Bookings
- `GET /bookings` - List bookings
- `POST /bookings` - Create booking (transactional)
- `GET /bookings/:id` - Booking detail
- `PATCH /bookings/:id` - Update booking

### Invoices & Payments
- `GET /invoices` - List invoices
- `POST /invoices` - Create invoice
- `GET /invoices/:id` - Invoice detail
- `POST /payments` - Record payment

### Reports
- `GET /reports/revenue`
- `GET /reports/expenses`
- `GET /reports/profit`
- `GET /reports/bookings`
- `GET /reports/outstanding-payments`

### Dashboard
- `GET /dashboard` - All dashboard data

### Public
- `POST /public/lead` - Landing page lead capture (no auth)

## License

Private - All rights reserved.
