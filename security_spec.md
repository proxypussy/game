# Security Specification — Aetheria Chronicles 2D Open-World RPG

## 1. Data Invariants
1. **Identity Isolation**: A player can only create or modify their own `publicProfiles/{userId}`, `users/{userId}/private/{saveId}`, and `bases/{userId}` documents where `userId == request.auth.uid` and `email_verified == true`.
2. **PII Isolation**: Zero PII (`email`, `phone`, `address`) is ever written to `publicProfiles`, `bases`, or `friendships`.
3. **Immutable Ownership & Timestamps**: `uid` / `ownerId` / `requesterId` / `createdAt` can never be changed after creation; `createdAt` and `updatedAt` must strictly equal `request.time`.
4. **Friendship State Integrity**: Friendships can only be created with `status == 'pending'` by `requesterId == request.auth.uid`, and can only transition from `'pending'` to `'accepted'` by `recipientId == request.auth.uid`.
5. **Bounded Collections**: All arrays (`inventory`, `ownedSkills`, `equippedSkills`, `discoveredEnemies`, `structures`, `participants`) have strict maximum length bounds to prevent 1MB exhaustion or Denial of Wallet.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Profile**: Creating `/publicProfiles/otherUid` while signed in as `attackerUid`.
2. **Unverified Email Write**: Attempting any write with `email_verified == false`.
3. **Shadow Field Injection**: Creating `/publicProfiles/{uid}` with an extra undocumented field `isAdmin: true`.
4. **ID Poisoning**: Creating `/friendships/` with a 200-char invalid ID containing `/$#`.
5. **Timestamp Spoofing**: Creating `/users/{uid}/private/main` with a forged past `createdAt`.
6. **Direct Friendship Self-Accept**: Creating `/friendships/{id}` directly with `status: 'accepted'`.
7. **Unauthorized Friendship Accept**: `requesterId` attempting to update `status` from `'pending'` to `'accepted'`.
8. **Private Save Snooping**: Signed-in user reading `/users/victimUid/private/main`.
9. **Base Vandalism**: Signed-in user modifying `/bases/victimUid` structures.
10. **Blanket List Scraping**: Listing `/friendships` without filtering where `request.auth.uid in participants`.
11. **Oversized String Poisoning**: Updating `displayName` to a 500-character string.
12. **Array Overflow Attack**: Uploading 500 structures into `/bases/{uid}` (exceeding max 150).
