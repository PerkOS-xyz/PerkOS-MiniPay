import { describe, it, expect, beforeEach, vi } from "vitest";

// The workflow/billing client funcs go through apiClient; mock it (and firebase,
// which perkosApi imports) so we test the client layer without network/SDK.
vi.mock("../app/lib/apiClient", () => ({
  authedJson: vi.fn(),
  authedFetch: vi.fn(),
}));
vi.mock("../app/lib/firebase", () => ({
  firebaseDb: () => ({}),
  firebaseAuth: () => ({}),
}));

import { authedJson, authedFetch } from "../app/lib/apiClient";
import {
  proposeWorkflow,
  getBillingMe,
  approveWorkflow,
} from "../app/lib/perkosApi";

const mockedJson = vi.mocked(authedJson);
const mockedFetch = vi.mocked(authedFetch);

beforeEach(() => {
  mockedJson.mockReset();
  mockedFetch.mockReset();
});

describe("proposeWorkflow", () => {
  it("POSTs the goal and unwraps .data", async () => {
    mockedJson.mockResolvedValue({
      data: { status: "proposed", docId: "d1", workflowState: "proposed", estimateCredits: 4, tasks: [], chat: "ok" },
    } as never);
    const res = await proposeWorkflow("proj1", "close the day");
    expect(res).toMatchObject({ status: "proposed", docId: "d1", estimateCredits: 4 });
    expect(mockedJson).toHaveBeenCalledWith(
      "/minipay/workflow/propose",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ projectId: "proj1", goal: "close the day" }) }),
    );
  });
});

describe("getBillingMe", () => {
  it("returns the billing snapshot", async () => {
    const billing = { credits: 12, freeWorkflowsLeft: 2, freeWorkflowsPerMonth: 3, membershipUntil: null, membershipActive: false, exempt: false, enrolled: true, creditUsd: 0.02 };
    mockedJson.mockResolvedValue(billing as never);
    expect(await getBillingMe()).toEqual(billing);
    expect(mockedJson).toHaveBeenCalledWith("/minipay/billing/me");
  });
});

describe("approveWorkflow", () => {
  it("returns the ok result on success", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ok: true, settlement: "credits", estimateCredits: 9, created: 2, balanceAfter: 11, freeWorkflowsLeft: null } }),
    } as never);
    const res = await approveWorkflow("proj1", "docA");
    expect(res).toMatchObject({ ok: true, settlement: "credits", created: 2 });
    expect(mockedFetch).toHaveBeenCalledWith(
      "/minipay/workflow/proj1/docA/approve",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces a 402 INSUFFICIENT_CREDITS as a structured result (not a throw)", async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: "INSUFFICIENT_CREDITS", need: 9, have: 2 } }),
    } as never);
    const res = await approveWorkflow("proj1", "docPoor");
    expect(res).toEqual({ ok: false, code: "INSUFFICIENT_CREDITS", need: 9, have: 2, estimateCredits: undefined, max: undefined });
  });

  it("defaults the code when the error body is empty", async () => {
    mockedFetch.mockResolvedValue({ ok: false, json: async () => ({}) } as never);
    const res = await approveWorkflow("p", "d");
    expect(res).toMatchObject({ ok: false, code: "APPROVE_FAILED" });
  });
});
