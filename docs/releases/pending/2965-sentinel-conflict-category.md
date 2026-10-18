# Sentinel no-retrieval conflict reports its real reason

## What changed

- A second `knowledge_receipt` no-retrieval (`trace_id: "none"`) receipt in the
  same session whose `task_id`/`phase` differs from the first now returns
  `wrong_task`, `wrong_phase`, or `duplicate_conflicting_terminal` instead of
  `store_unavailable` (`src/hooks/knowledge-receipt-ledger.ts`).
- The immutability rule itself is unchanged; only the reported category is.

## Why

`store_unavailable` reads as a transient store failure, but this conflict is
permanent for the session. Agents and operators now see an actionable reason.
