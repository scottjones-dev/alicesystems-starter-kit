import { describe, expect, it, vi } from "vitest";

import { createDevices, MAX_DEVICE_TOKENS } from "./devices";

type Update = (
  request: { credentials: { deviceTokens: string[] }; providerId: string },
  subscriberId: string
) => Promise<object>;

const setup = (existing: string[]) => {
  const update = vi.fn<Update>().mockResolvedValue({});
  const retrieve = vi.fn<() => Promise<object>>().mockResolvedValue({
    result: {
      channels: [
        { credentials: { deviceTokens: existing }, providerId: "expo" },
      ],
    },
  });
  // SAFETY: the helpers only call subscribers.retrieve and subscribers.credentials.update.
  const client = {
    subscribers: { credentials: { update }, retrieve },
  } as never;
  return { devices: createDevices(client), update };
};

describe("registerDevice", () => {
  it("adds a new token next to the existing ones", async () => {
    const { devices, update } = setup(["ExponentPushToken[a]"]);
    await devices.registerDevice("user_1", "ExponentPushToken[b]");
    expect(update).toHaveBeenCalledWith(
      {
        credentials: {
          deviceTokens: ["ExponentPushToken[a]", "ExponentPushToken[b]"],
        },
        providerId: "expo",
      },
      "user_1"
    );
  });

  it("does nothing when the token is already registered", async () => {
    const { devices, update } = setup(["ExponentPushToken[a]"]);
    await devices.registerDevice("user_1", "ExponentPushToken[a]");
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps the newest tokens when the cap is reached", async () => {
    const existing = Array.from(
      { length: MAX_DEVICE_TOKENS },
      (_, index) => `t${index}`
    );
    const { devices, update } = setup(existing);
    await devices.registerDevice("user_1", "new");
    const saved = update.mock.calls[0]?.[0].credentials.deviceTokens ?? [];
    expect(saved).toHaveLength(MAX_DEVICE_TOKENS);
    expect(saved.at(-1)).toBe("new");
    expect(saved).not.toContain("t0");
  });
});

describe("unregisterDevice", () => {
  it("removes only that token", async () => {
    const { devices, update } = setup(["a", "b", "c"]);
    await devices.unregisterDevice("user_1", "b");
    expect(update).toHaveBeenCalledWith(
      { credentials: { deviceTokens: ["a", "c"] }, providerId: "expo" },
      "user_1"
    );
  });

  it("does nothing for a token that is not registered", async () => {
    const { devices, update } = setup(["a"]);
    await devices.unregisterDevice("user_1", "zzz");
    expect(update).not.toHaveBeenCalled();
  });
});
