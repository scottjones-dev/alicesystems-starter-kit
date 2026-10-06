import type { Novu } from "@novu/api";
import { ChatOrPushProviderEnum } from "@novu/api/models/components";
import { keys as base } from "@repo/env/base";

import { createNovuClient } from "./client";
import { keys } from "./keys";

/** Novu allows at most 100 device tokens per subscriber and provider. */
export const MAX_DEVICE_TOKENS = 100;

type SubscribersApi = Pick<Novu, "subscribers">;

const tokensOf = async (client: SubscribersApi, subscriberId: string) => {
  const { result } = await client.subscribers.retrieve(subscriberId);
  const channel = result.channels?.find(
    (entry) => entry.providerId === ChatOrPushProviderEnum.Expo
  );
  return channel?.credentials.deviceTokens ?? [];
};

const save = async (
  client: SubscribersApi,
  subscriberId: string,
  deviceTokens: string[]
) => {
  await client.subscribers.credentials.update(
    {
      credentials: { deviceTokens },
      providerId: ChatOrPushProviderEnum.Expo,
    },
    subscriberId
  );
};

/**
 * Device-token helpers for Expo push. Tokens live on the Novu subscriber, which is created
 * by the first notification sent to that user (the verification email at sign-up), so
 * register a device after that. Tests pass a fake client.
 */
export const createDevices = (client: SubscribersApi) => ({
  /** Add an Expo push token to a user. Safe to call again with the same token. */
  async registerDevice(subscriberId: string, expoToken: string) {
    const existing = await tokensOf(client, subscriberId);
    if (existing.includes(expoToken)) {
      return;
    }
    // Keep the newest tokens if the cap is reached.
    await save(
      client,
      subscriberId,
      [...existing, expoToken].slice(-MAX_DEVICE_TOKENS)
    );
  },

  /** Remove one token (for example on sign-out). Other devices are untouched. */
  async unregisterDevice(subscriberId: string, expoToken: string) {
    const existing = await tokensOf(client, subscriberId);
    if (!existing.includes(expoToken)) {
      return;
    }
    await save(
      client,
      subscriberId,
      existing.filter((token) => token !== expoToken)
    );
  },
});

/**
 * The helpers for the running app. Push goes through Novu, so with no Novu key (development
 * with the smtp transport) they do nothing; production always has a key (see selectTransport).
 */
const forApp = () => {
  const { NOVU_REGION, NOVU_SECRET_KEY } = keys.env();
  const client = createNovuClient(NOVU_SECRET_KEY, NOVU_REGION);
  if (client) {
    return createDevices(client);
  }
  if (base.env().NODE_ENV === "production") {
    throw new Error("Push needs Novu: NOVU_SECRET_KEY is not set.");
  }
  return null;
};

export const registerDevice = async (
  subscriberId: string,
  expoToken: string
) => {
  await forApp()?.registerDevice(subscriberId, expoToken);
};

export const unregisterDevice = async (
  subscriberId: string,
  expoToken: string
) => {
  await forApp()?.unregisterDevice(subscriberId, expoToken);
};
