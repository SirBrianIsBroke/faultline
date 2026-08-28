# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Send a private report through GitHub's security advisory flow with:

- The affected version or commit.
- Reproduction steps or a small proof of concept.
- The impact you observed.
- Any mitigation you already tested.

I will acknowledge a complete report as soon as I can and keep the discussion inside the private advisory until a fix is available.

## Safe operation

Faultline can capture page content and API response structure. Use dedicated test identities, keep secrets in environment variables or a secret manager, and treat generated evidence as potentially sensitive. Do not publish artifacts from private or production environments without reviewing them first.
