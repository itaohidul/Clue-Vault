# Security Specification & Threat Model — CLUEVAULT

## 1. Data Invariants

1. **Identity Isolation**: A user can only read and write their own profile, resources, and state matching their authenticated Telegram user identity.
2. **Key Validation & Type Safety**: Each sub-object (`user`, `resources`, `base`, `unlockedTabs`) must strictly match expected TypeScript types and shapes.
3. **Immutability of Owner ID**: The `telegram_id` property must remain immutable and equal to the authenticated user's ID after record creation.
4. **Time Stamp Integrity**: The `created_at` field is generated and guaranteed key server-side.
5. **No System Override**: A client cannot set unauthorized state (e.g. infinite coins/keys) or bypass the established database constraints.

---

## 2. Row Level Security and Protection Against Malicious Payloads

Each of these threat scenarios is protected by Supabase Row Level Security (RLS) policies and PostgreSQL schemas:

1. **Payload 1: Spoofed Identity**
   - *Threat*: User `A` tries to update or retrieve a user record belonging to `B`.
   - *Handling*: Blocked via Supabase RLS where user access is limited to matching `telegram_id`.
2. **Payload 2: Negative Coins / Keys**
   - *Threat*: Updating the database where balances or resources are negative or maliciously formatted.
   - *Handling*: DB constraints ensure positive values, and our API handles inputs safely.
3. **Payload 3: Empty String Codename Injection**
   - *Threat*: Submitting a user name with size 0 or empty string.
4. **Payload 4: Client Timestamp Hijack**
   - *Threat*: Providing a client-side falsified timestamp.
   - *Handling*: Handled directly by `now()` server timestamping on insertion.
5. **Payload 5: Mutating Immutable Fields**
   - *Threat*: Authenticated owner attempts to rewrite `telegram_id` of their own document to another user ID.
   - *Handling*: Protected by API validation and RLS constraints.
6. **Payload 6: Blanket Listing Attack**
   - *Threat*: Authenticated user `A` attempting to query all profiles across the entire table.
   - *Handling*: Restricted using secure API route queries and index filtering.

---

## 3. Row Level Security Schemas

Handled during data layer validation in Vercel Serverless frames with Supabase PostgreSQL.
