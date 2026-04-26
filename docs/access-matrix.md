# Access Matrix

This document defines the intended access model for firm operations across backend modules.

## Role Definitions

- `SUPER_ADMIN`: platform-wide governance across all practices.
- `ADMIN`: firm owner/firm admin with full control inside own practice(s).
- `LAWYER`: lead lawyer with full control inside own practice(s).
- `ASSOCIATE`: limited to assigned/linked records in own practice(s).
- `PARALEGAL`: limited to assigned/linked records in own practice(s).
- `CLIENT`: only own client-linked data.

## Core Policy Rules

- Practice isolation is the default: no cross-practice data visibility except `SUPER_ADMIN`.
- `ADMIN` and `LAWYER` are practice-wide operators for day-to-day firm operations.
- `ASSOCIATE` and `PARALEGAL` follow least-privilege access: assignment/participation based.
- AI assistant and document search must always return sources filtered by the same document access policy.

## Module Access Matrix

### Documents

- `SUPER_ADMIN`: read/manage all documents.
- `ADMIN`, `LAWYER`: read/manage all documents in own practice(s).
- `ASSOCIATE`, `PARALEGAL`: read documents linked to own work in own practice(s):
  - uploaded by self, or
  - case assigned to self, or
  - client-linked to self.
- `CLIENT`: read own client-linked documents only.

### Cases

- `SUPER_ADMIN`: read/manage all cases.
- `ADMIN`, `LAWYER`: read/manage all cases in own practice(s).
- `ASSOCIATE`, `PARALEGAL`: read/manage assigned cases in own practice(s).
- `CLIENT`: read own cases only.

### Billing

- `SUPER_ADMIN`: read/manage all billing records.
- `ADMIN`, `LAWYER`: read/manage all billing in own practice(s).
- `ASSOCIATE`, `PARALEGAL`: read linked billing in own practice(s), manage own records.
- `CLIENT`: read own/linked billing only.

### Calendar

- `SUPER_ADMIN`: read/manage all events.
- `ADMIN`, `LAWYER`: read/manage practice-wide events in own practice(s).
- `ASSOCIATE`, `PARALEGAL`: read own-created or participant events in own practice(s); update/delete own-created events.
- `CLIENT`: read own-created or participant events only (within linked practice context).

### Tasks

- `SUPER_ADMIN`: read/manage all tasks.
- `ADMIN`, `LAWYER`: read/manage all tasks in own practice(s), including assignment.
- `ASSOCIATE`, `PARALEGAL`: read/manage only tasks created by self or assigned to self in own practice(s).
- `CLIENT`: read own-created or assigned tasks only (if enabled for client workflows).

## Super Admin User Grouping Conventions

- Team grouping is practice-based.
- Practice owner is derived as the first active member in that practice (join order).
- UI grouping should render:
  - owner row first,
  - team members below owner,
  - collapsible only when team members exist.

## Implementation Notes

- Service-layer checks are the source of truth; UI guards are secondary.
- For any new endpoint:
  1. resolve role + active practice memberships,
  2. apply read filter by role/scope,
  3. enforce manage/update/delete checks before mutation.
- Avoid broad `practiceId in memberships` reads for associate/paralegal unless paired with ownership/assignment constraints.

## Validation Checklist (for future changes)

- Can an `ADMIN` see/update data outside their practice? (must be No)
- Can an `ASSOCIATE` access unrelated records in same practice? (must be No)
- Does `CLIENT` access remain own/linked-only? (must be Yes)
- Do AI/search endpoints call the same backend access path as normal read APIs? (must be Yes)
- Do list and single-record endpoints enforce consistent rules? (must be Yes)
