/**
 * Adversarial security test specification for Firestore rules.
 * Run against Firebase Emulator Suite when testing locally.
 */
export const DIRTY_DOZEN_TESTS = [
  {
    name: '1. Identity Spoofing on PublicProfile',
    path: 'publicProfiles/victim_uid',
    operation: 'create',
    payload: { uid: 'victim_uid', displayName: 'Spoofer' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Unverified Email Write',
    path: 'publicProfiles/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Shadow Field Injection',
    path: 'publicProfiles/attacker_uid',
    operation: 'create',
    payload: { uid: 'attacker_uid', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. ID Poisoning',
    path: 'friendships/invalid$id#200',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Timestamp Spoofing',
    path: 'users/attacker_uid/private/main',
    operation: 'create',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Direct Friendship Self-Accept',
    path: 'friendships/f_123',
    operation: 'create',
    payload: { status: 'accepted' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Unauthorized Friendship Accept by Requester',
    path: 'friendships/f_123',
    operation: 'update',
    auth: { uid: 'requester_uid' },
    payload: { status: 'accepted' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Private Save Snooping',
    path: 'users/victim_uid/private/main',
    operation: 'get',
    auth: { uid: 'attacker_uid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Base Vandalism',
    path: 'bases/victim_uid',
    operation: 'update',
    auth: { uid: 'attacker_uid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Blanket List Scraping on Friendships',
    path: 'friendships',
    operation: 'list',
    auth: { uid: 'attacker_uid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Oversized String Poisoning',
    path: 'publicProfiles/attacker_uid',
    operation: 'update',
    payload: { displayName: 'A'.repeat(500) },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Array Overflow Attack on Base Structures',
    path: 'bases/attacker_uid',
    operation: 'update',
    payload: { structuresCount: 500 },
    expected: 'PERMISSION_DENIED',
  },
];
