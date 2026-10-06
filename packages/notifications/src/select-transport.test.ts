import { describe, expect, it } from "vitest";
import type { TransportConfig } from "./select-transport";
import { selectTransport } from "./select-transport";

const trigger = () => Promise.resolve({});

const base: TransportConfig = {
  baseUrl: "https://example.com",
  emailFrom: "no-reply@example.com",
  isProduction: false,
  // SAFETY: only the presence of a client matters here.
  novu: { trigger } as never,
  smtp: { host: "localhost", port: 1025 },
  transport: "smtp",
};

describe("selectTransport", () => {
  it("picks the transport that was asked for", () => {
    expect(selectTransport(base).name).toBe("smtp");
    expect(selectTransport({ ...base, transport: "novu" }).name).toBe("novu");
    expect(selectTransport({ ...base, transport: "log" }).name).toBe("log");
  });

  it("refuses novu without a key, because no email would ever be sent", () => {
    expect(() =>
      selectTransport({ ...base, novu: null, transport: "novu" })
    ).toThrow("NOVU_SECRET_KEY");
  });

  it("refuses smtp without a host, a port or a from address", () => {
    expect(() => selectTransport({ ...base, smtp: { port: 1025 } })).toThrow(
      "SMTP_HOST"
    );
    expect(() =>
      selectTransport({ ...base, smtp: { host: "localhost" } })
    ).toThrow("SMTP_PORT");
    expect(() => selectTransport({ ...base, emailFrom: undefined })).toThrow(
      "EMAIL_FROM_ADDRESS"
    );
    expect(() => selectTransport({ ...base, smtp: undefined })).toThrow(
      "SMTP_HOST"
    );
  });

  it("only allows novu in production, so mail is never dropped or sent to a dev inbox", () => {
    expect(
      selectTransport({ ...base, isProduction: true, transport: "novu" }).name
    ).toBe("novu");
    for (const transport of ["smtp", "log"] as const) {
      expect(() =>
        selectTransport({ ...base, isProduction: true, transport })
      ).toThrow("production sends through novu");
    }
  });
});
