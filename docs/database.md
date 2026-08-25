# Database Schema - Studio ERP

## Overview

The database uses PostgreSQL with Prisma ORM. All tables use UUID primary keys and timestamp tracking (createdAt, updatedAt). Critical financial tables support soft deletion (deletedAt).

## Entity Relationship Diagram

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Users   │─────│  Role_Users  │─────│   Roles      │
└──────────┘     └──────────────┘     └──────┬───────┘
                                             │
                                    ┌────────┴────────┐
                                    │ Role_Permissions│
                                    └────────┬────────┘
                                             │
                                      ┌──────┴───────┐
                                      │ Permissions  │
                                      └──────────────┘

┌───────────┐     ┌──────────────┐     ┌──────────────┐
│ Customers │─────│  Customer_   │─────│   Bookings   │
│           │     │  Bookings    │     │              │
└─────┬─────┘     └──────────────┘     └──────┬───────┘
      │                                        │
      │     ┌──────────────────────────────────┤
      │     │                                  │
      │     ▼                                  ▼
      │ ┌───────────┐              ┌──────────────────┐
      │ │  Invoices  │              │     Events       │
      │ └─────┬─────┘              └──────────────────┘
      │       │
      │       ▼
      │ ┌──────────────┐          ┌──────────────────────┐
      │ │Invoice_Items │          │  Booking_Services    │
      │ └──────────────┘          └──────────────────────┘
      │
      │     ┌──────────────────┐  ┌──────────────────────┐
      ├─────│   Payments       │  │ Booking_Equipment    │
      │     └──────────────────┘  └──────────────────────┘
      │                                    │
      │                                    ▼
      │                           ┌──────────────┐
      │                           │  Equipment   │
      │                           └──────────────┘
      │
      │     ┌──────────────────┐
      ├─────│ Communications   │
      │     └──────────────────┘
      │
      │     ┌──────────────────┐
      └─────│Campaign_Recipients│
            └──────────────────┘

┌───────────┐     ┌──────────────┐     ┌──────────────┐
│  Leads    │─────│ Lead_Customer│─────│  Customers   │
└───────────┘     └──────────────┘     └──────────────┘

┌───────────┐     ┌──────────────┐     ┌──────────────┐
│ Suppliers │─────│External_     │─────│  Bookings    │
│           │     │Rentals       │     │              │
└───────────┘     └──────────────┘     └──────────────┘

┌────────────────────┐
│ Marketing_Campaigns│
└─────────┬──────────┘
          │
  ┌───────┴──────────┐
  │Campaign_Recipients│
  └──────────────────┘

┌──────────────┐     ┌──────────────┐
│ Audit_Logs   │     │ Notifications│
└──────────────┘     └──────────────┘

┌──────────────┐     ┌────────────────────┐
│  Settings    │     │ Customer_Documents │
└──────────────┘     └────────────────────┘

┌────────────────────┐
│    Expenses        │
│  (→ Bookings)      │
└────────────────────┘

┌────────────────────┐
│    Services        │
│  (→ BookingServices)│
└────────────────────┘
```

## Cardinalities

| Entity A | Relation | Entity B |
|----------|----------|----------|
| Customer | 1:N | Bookings |
| Booking | 1:1 | Event |
| Booking | 1:N | BookingServices |
| Service | 1:N | BookingServices |
| Booking | 1:N | BookingEquipment |
| Equipment | 1:N | BookingEquipment |
| Booking | 1:N | Invoices |
| Invoice | 1:N | InvoiceItems |
| Invoice | 1:N | Payments |
| Customer | 1:N | Invoices |
| Customer | 1:N | Payments |
| Supplier | 1:N | ExternalRentals |
| Booking | 1:N | ExternalRentals |
| Booking | 1:N | Expenses |
| Customer | 1:N | Leads |
| User | 1:N | AuditLogs |
| MarketingCampaign | 1:N | CampaignRecipients |
| Customer | 1:N | CampaignRecipients |
| User | 1:N | Notifications |
| Customer | 1:N | Communications |
| Customer | 1:N | CustomerDocuments |

## Indexes

- customers: phone, email, fullName, source, customerStatus
- bookings: customerId, status, bookingNumber, eventId
- events: eventDate, eventType, city
- invoices: invoiceNumber, customerId, bookingId, status
- payments: invoiceId, bookingId, customerId, paymentDate
- equipment: status, category, serialNumber, ownershipType
- leads: status, source, assignedToId, customerId
- audit_logs: userId, entity, entityId, action
- notifications: userId, isRead
- settings: key, category

## Enums

- UserStatus: ACTIVE, INACTIVE, SUSPENDED
- CustomerSource: WEBSITE, TIKTOK, SNAPCHAT, INSTAGRAM, FACEBOOK, WHATSAPP, REFERRAL, WALK_IN, OTHER
- CustomerStatus: LEAD, ACTIVE, PREVIOUS_CUSTOMER, VIP, INACTIVE
- LeadStatus: NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, CONVERTED, LOST
- BookingStatus: DRAFT, PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
- EventType: WEDDING, ENGAGEMENT, PARTY, CORPORATE_EVENT, STUDIO_SESSION, OTHER
- ServiceStatus: ACTIVE, INACTIVE, ARCHIVED
- OwnershipType: OWNED, RENTED
- EquipmentStatus: AVAILABLE, RESERVED, IN_USE, MAINTENANCE, LOST, DAMAGED, UNAVAILABLE
- InvoiceStatus: DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED
- InvoiceItemType: SERVICE, EQUIPMENT, RENTAL, ADDITIONAL_CHARGE, DISCOUNT
- PaymentMethod: CASH, BANK_TRANSFER, CARD, ONLINE_PAYMENT, OTHER
- ExpenseCategory: EQUIPMENT_RENTAL, MAINTENANCE, TRANSPORTATION, STAFF, MARKETING, STUDIO_RENT, UTILITIES, OTHER
- CampaignStatus: DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- RecipientStatus: PENDING, SENT, DELIVERED, FAILED, OPTED_OUT
- SupplierStatus: ACTIVE, INACTIVE
- ExternalRentalStatus: PENDING, CONFIRMED, RETURNED, CANCELLED

## Backup Strategy

```bash
# Daily backup
pg_dump -U postgres studio_erp > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres studio_erp < backup_YYYYMMDD.sql

# Automated via cron (add to crontab):
0 2 * * * pg_dump -U postgres studio_erp | gzip > /backups/studio_erp_$(date +\%Y\%m\%d).sql.gz

# Retention: keep 30 daily backups
find /backups -name "studio_erp_*.sql.gz" -mtime +30 -delete
```
