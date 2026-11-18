import test from "node:test";
import assert from "node:assert/strict";
import { acceptInvite, onboardingRequest } from "./community_onboarding.ts";

test("an active invite admits a typed player request", () => {
  const input = {
    inviteCode: "PLAY1234",
    email: "player@example.com",
    password: "correct horse battery",
    name: "Ari"
  };
  assert.equal(acceptInvite(input.inviteCode, ["PLAY1234"]), true);
  assert.deepEqual(onboardingRequest.parse(input).inviteCode, "PLAY1234");
});

test("an unknown invite is rejected before account creation", () => {
  assert.equal(acceptInvite("PLAY1234", ["OTHER99"]), false);
});
