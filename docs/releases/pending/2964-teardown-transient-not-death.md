## Fixed

- `teardownEphemeralSessionVerified` no longer reports a verify timeout or transient transport failure on `session.get` as confirmed session death. These now return the typed `ephemeral-session-teardown-unverified` failure with `reason: 'verify-unreadable'`, so a slow or unreachable host no longer suppresses the leaked-session advisory or dead-lane reclaim.
