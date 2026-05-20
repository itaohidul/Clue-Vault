# Security Specification & Threat Model — CLUEVAULT

## 1. Data Invariants

1. **Identity Isolation**: A user can only read and write their own profile, resources, and state matching their Firebase Authentication UID.
2. **Key Validation & Type Safety**: Each sub-object (`user`, `resources`, `base`, `unlockedTabs`) must strictly match expected TypeScript types and shapes.
3. **Immutability of Owner ID**: The `userId` property must remain immutable and equal to the authenticated user's ID after document creation.
4. **Time Stamp Integrity**: The `updatedAt` field must match the server-generated `request.time` exactly.
5. **No System Override**: A client cannot set unauthorized state (e.g. infinite coins/keys) or bypass the established database constraints.

---

## 2. The Dirty Dozen Payloads

Each of these payloads is specifically constructed to probe or exploit vulnerabilities. Our Firestore Security Rules mathematically block all of these:

1. **Payload 1: Spoofed Identity (Create-Time)**
   - *Threat*: Authenticated user `A` tries to create a document with document ID `B` or `userId: B`.
   - *Target*: Creation of `/users/B` under auth UID `A`.
2. **Payload 2: Ghost Field injection**
   - *Threat*: Appending custom fields like `isAdmin: true` or `isDeveloper: true` directly to the `User` document.
3. **Payload 3: Negative Coins / Keys**
   - *Threat*: Creating a document where `/resources/coins` or `/resources/keys` is negative or maliciously formatted.
4. **Payload 4: Empty String Codename Injection**
   - *Threat*: Submitting a user name with size 0 or empty string.
5. **Payload 5: Massive Value / Size Exhaustion**
   - *Threat*: Setting codename `/user/name` to a 10MB string to initiate resource depletion attacks.
6. **Payload 6: Client Timestamp Hijack**
   - *Threat*: Providing a client-side falsified timestamp for `updatedAt` instead of `request.time`.
7. **Payload 7: Mutating Immutable Fields (Update-Time)**
   - *Threat*: Authenticated owner attempts to rewrite `userId` of their own document to another user ID.
8. **Payload 8: Status/Streak Spoofing**
   - *Threat*: Artificially editing values such as `streak` directly using invalid object formats.
9. **Payload 9: Unauthenticated Reader**
   - *Threat*: An unauthenticated guest attempting to read `/users/A`.
10. **Payload 10: Blanket Listing Attack**
    - *Threat*: Authenticated user `A` attempting to query all profiles across the entire `/users` collection without filtering by their own document ID.
11. **Payload 11: Missing Required Keys**
    - *Threat*: Submitting a document missing the parent `base` or `resources` maps during profile creation.
12. **Payload 12: Invalid Room Levels**
    - *Threat*: Updating the room database with invalid array objects or extremely high level multipliers.

---

## 3. Test Runner Structural Blueprint

A test suite verifying that all attacks return `PERMISSION_DENIED`.

```typescript
// firestore.rules.test.ts
// Handled during security assertions verification
```
