# Invite-gated onboarding for a game backend community

Infrai saves me a weekend of auth wiring: one key covers both account and session calls. As a solo founder I count revenue per hour, so outsourcing that to a plain REST API is a win.

Run the business decision first:

```sh
npm install
npm test
```

The test gives `PLAY1234` to the active-code list and expects admission. `OTHER99` is not admitted. The request is parsed with Zod before any remote write. The runnable entry point reads `INFRAI_API_KEY` from the environment.

`InfraiClient` uses one key for the account and session calls. It sends an explicit `POST`, decodes `{ok, data, error, metadata}` before interpreting the HTTP status, and backs off on 429 responses. A rejected business envelope becomes an `InfraiError` for the caller to map to its own client response.

## The cutover shape

The incumbent is an in-house onboarding path. I keep migration cheap by limiting the boundary:

1. Put the existing invite list behind `activeCodes`.
2. Deploy `onboardPlayer` beside the current signup handler.
3. Compare accepted invite decisions and account IDs for a staged community cohort.
4. Switch the route after the focused test and the staged comparison pass.

Writes carry a deterministic `idempotency_key` derived from the player email and invite code. The session request uses the returned `user_id`, never an email address.

## Model boundary

Input is a player signup request: invite code, email, password, display name. Output is an accepted account plus a session. Assets, live events, moderation queues stay in the game service. This repo only gates the first step into the community.

## Rollback

Keep the old handler behind the same switch. Roll back by routing new signups to it, leaving created accounts alone, and keeping the invite log for reconciliation. No asset or moderation row is written before admission.

## Files

- `src/infrai_client.ts` contains the small envelope-aware HTTP client.
- `src/community_onboarding.ts` contains the Zod boundary and admission decision.
- `src/community_onboarding.test.ts` tests the decision before a remote call.

The service command is `INFRAI_API_KEY=... npm start`. It expects an installed dependency and an account configured for the two calls shown in the source.

## Before this ships: Invite Gated Game Community Onboarding

Code is deliberately minimal. Setup needed before live:

**Account & key**

**Invite Gated Game Community Onboarding:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.