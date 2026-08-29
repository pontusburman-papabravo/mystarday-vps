# No Silent Fallbacks

The agent must not add fallback semantics to make code/tests green unless that behavior is explicitly approved.

## Forbidden pattern

```
failed family config → silently use defaults
```

when it masks a real error.

New fallback that changes user behavior = **design decision**, not a test hack.
