# Feature Lifecycle

```
IDEA
→ EVALUATED
→ APPROVED / REJECTED
→ IMPLEMENTED
→ RELEASED
→ MEASURED
→ KEEP / CHANGE / DEPRECATE
→ DEPRECATED
→ REMOVAL_SAFE_VERIFIED
→ REMOVED
```

## REMOVED requires verification of

- API consumers
- DB/state
- Old client versions
- Routing/deep links
- Backward compatibility
- Analytics usage (where relevant)

No fixed number of release cycles — verify removal safety explicitly.
