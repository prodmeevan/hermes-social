# Contributing

Thanks for helping improve Hermes Social. This project is beta; site UI and access rules can change without notice.

## Before opening an issue

- Include OS, Node version (`node --version`), command, and sanitized error output.
- Say which site/action failed and whether page required login.
- Never include passwords, login codes, cookies, browser profile files, personal account data, or private post content.
- For site behavior, report the public URL only if it is safe to share.

## Development checks

No npm install is needed. Run from the project directory:

```text
node --check hermes-social.mjs
node --check mcp-server.mjs
node test.mjs
hermes mcp test hermes-social
```

For site changes, run a minimal CLI reproduction and confirm temporary tabs close after both success and failure. Do not claim a platform works unless its returned page text has been checked.

## Pull requests

- Keep changes small and explain the user-visible behavior.
- Add or update assert-based tests for command parsing and validation.
- Preserve read-only behavior and the dedicated Edge profile boundary.
- Never add cookie/session extraction, password handling, CAPTCHA solving, stealth, paywall bypass, or account-changing actions.
- Do not add dependencies unless there is a clear need and the reason is discussed first.
- Update README tested-status table when platform behavior changes.

## Security reports

Do not post credentials, session data, or exploitable private details in public issues. Contact the maintainer privately through GitHub's security reporting flow.
