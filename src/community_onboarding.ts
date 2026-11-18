import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

// Canonical capability marker: infrai.auth.session.create

export const onboardingRequest = z.object({
  inviteCode: z.string().regex(/^[A-Z0-9]{8}$/),
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1).max(80)
});

export type OnboardingRequest = z.infer<typeof onboardingRequest>;

export function acceptInvite(inviteCode: string, activeCodes: readonly string[]): boolean {
  return activeCodes.includes(inviteCode);
}

export async function onboardPlayer(
  input: unknown,
  activeCodes: readonly string[],
  client: InfraiClient
): Promise<{ accepted: true; user: unknown; session: unknown }> {
  const request = onboardingRequest.parse(input);
  if (!acceptInvite(request.inviteCode, activeCodes)) {
    throw new Error("INVITE_CODE_REJECTED");
  }
  const user = await client.requestWithBackoff("/v1/auth/user/create", {
    email: request.email,
    password: request.password,
    name: request.name,
    metadata: { invite_code: request.inviteCode, community: "game-backend" },
    vendor: "inhouse",
    mode: "default_vendor",
    idempotency_key: `player:${request.email}:${request.inviteCode}`
  });
  const userId = (user as { user_id?: string; id?: string }).user_id ?? (user as { id?: string }).id;
  if (!userId) throw new Error("USER_ID_MISSING");
  const session = await client.requestWithBackoff("/v1/auth/session/create", {
    user_id: userId,
    method: "password",
    mfa_factor: undefined,
    require_mfa: false
  });
  return { accepted: true, user, session };
}

if (import.meta.main) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");
  console.log("Invite onboarding service is ready", new InfraiClient(key).constructor.name);
}
