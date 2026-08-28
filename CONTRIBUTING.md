# Contributing

Thanks for taking a look at Faultline.

## Local setup

```bash
npm install
npx playwright install chromium
npm run verify
```

The demo candidate is intentionally broken. `npm run demo` should still exit successfully and generate a `HOLD` report; the CLI itself exits nonzero for a hold verdict so it can gate CI.

## Pull requests

- Keep behavior changes focused and explain the release risk they address.
- Add or update tests when the failure model changes.
- Do not commit real credentials, production payloads, or private screenshots.
- Keep comments for decisions and edge cases that the code cannot explain on its own.
- Run `npm run verify` before requesting review.
