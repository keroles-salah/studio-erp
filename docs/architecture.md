# Architecture - Studio ERP

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    Users                             │
│         (Browser / Mobile / Tablet)                  │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Vite)                 │
│   ┌─────────────┐  ┌──────────────────────────┐     │
│   │ Admin Panel  │  │   Public Landing Page    │     │
│   │ (Dashboard,  │  │   (Lead Capture Form)    │     │
│   │  CRM, etc.)  │  │                          │     │
│   └─────────────┘  └──────────────────────────┘     │
└──────────────┬──────────────────────────────────────┘
               │ REST API (JSON)
               ▼
┌─────────────────────────────────────────────────────┐
│           Backend (Node.js + Express)                │
│   ┌────────────────────────────────────────────┐     │
│   │              API Layer (v1)                │     │
│   │  Auth | Users | Customers | Leads | ...    │     │
│   └─────────────────┬──────────────────────────┘     │
│                     │                                 │
│   ┌─────────────────▼──────────────────────────┐     │
│   │           Service Layer                     │     │
│   │  Business logic, validation, transactions   │     │
│   └─────────────────┬──────────────────────────┘     │
│                     │                                 │
│   ┌─────────────────▼──────────────────────────┐     │
│   │          Data Access (Prisma ORM)           │     │
│   └─────────────────┬──────────────────────────┘     │
│   ┌─────────────────▼──────────────────────────┐     │
│   │     Middleware: Auth, RBAC, Rate Limit      │     │
│   │     Audit Log, Error Handler                │     │
│   └────────────────────────────────────────────┘     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL 16                            │
│   (Primary data store, all business data)            │
└─────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│              Object Storage                          │
│   (Invoice PDFs, portfolio images, documents)        │
└─────────────────────────────────────────────────────┘
```

## Backend Module Structure

```
backend/src/
├── config/           # App configuration, Prisma client
├── common/           # Shared utilities (errors, helpers, middleware)
├── modules/
│   ├── auth/         # Authentication & authorization
│   ├── users/        # User management
│   ├── roles/        # Roles & permissions (RBAC)
│   ├── customers/    # Customer CRM
│   ├── leads/        # Lead management & conversion
│   ├── services/     # Services catalog
│   ├── equipment/    # Equipment inventory
│   ├── suppliers/    # Supplier management
│   ├── external-rentals/ # External equipment rentals
│   ├── bookings/     # Booking & event management
│   ├── invoices/     # Invoice generation & tracking
│   ├── payments/     # Payment processing & tracking
│   ├── expenses/     # Expense management
│   ├── reports/      # Financial & business reports
│   ├── dashboard/    # Dashboard data aggregation
│   ├── marketing/    # Marketing campaigns & segmentation
│   ├── notifications/ # System notifications
│   ├── audit/        # Audit logs
│   ├── settings/     # System settings
│   ├── analytics/    # AI-ready analytics endpoints
│   └── public/       # Public endpoints (lead capture)
├── app.ts            # Express app setup
└── main.ts           # Server bootstrap
```

## Key Architectural Decisions

1. **Modular Architecture** - Each business domain is self-contained with controller, service, routes, and DTO files.

2. **Transactional Operations** - Booking creation, payment recording, and invoice generation are wrapped in Prisma transactions to ensure data integrity.

3. **Soft Deletion** - Customers, bookings, invoices, and equipment use soft deletion (deletedAt) to preserve historical financial data.

4. **RBAC** - Role-based access control with fine-grained permissions per module and action.

5. **Audit Trail** - Every significant action is logged with old/new values for compliance.

6. **API Versioning** - All routes under `/api/v1/` for forward compatibility.

7. **AI-Ready** - Analytics endpoints provide structured data for future AI agent integration without direct database access.

8. **Bilingual** - Full Arabic (RTL) and English (LTR) support in both frontend and backend.

## Security Architecture

- Password hashing with bcrypt (10 rounds)
- JWT access tokens (15 min) + refresh tokens (7 days)
- Helmet for secure HTTP headers
- CORS whitelist
- Rate limiting (100 req/15min general, 10 req/15min auth)
- Input validation with Zod on all DTOs
- SQL injection protection via Prisma parameterized queries
- No secrets in source code (environment variables only)
- Soft delete for financial records (never permanent deletion)

## Data Integrity

- PostgreSQL foreign key constraints
- Unique constraints on critical fields (email, booking_number, invoice_number, equipment_code)
- Check constraints via Prisma enums
- Database indexes on frequently queried fields
- Transactions for multi-table operations
