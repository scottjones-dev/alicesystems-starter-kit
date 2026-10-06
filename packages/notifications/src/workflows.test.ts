import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { RuntimeEvent } from "./events";
import { eventIds, events } from "./events";
import { buildWorkflow, buildWorkflows } from "./workflows";

const BASE_URL = "https://example.com";

const discoverAll = () =>
  Promise.all(buildWorkflows(BASE_URL).map((workflow) => workflow.discover()));

describe("workflows built from the catalog", () => {
  it("has one workflow per event, named after it", async () => {
    const found = await discoverAll();
    expect(found.map((workflow) => workflow.workflowId).toSorted()).toEqual(
      [...eventIds].toSorted()
    );
  });

  it("has an email step and no push step for the current events", async () => {
    for (const workflow of await discoverAll()) {
      expect(workflow.steps.map((step) => step.type)).toEqual(["email"]);
    }
  });

  it("makes security workflows read-only, and the invitation optional", async () => {
    for (const workflow of await discoverAll()) {
      const critical = workflow.workflowId !== "organization-invitation";
      expect(
        Boolean(workflow.preferences?.all?.readOnly),
        workflow.workflowId
      ).toBe(critical);
    }
  });
});

describe("buildWorkflow", () => {
  const withPush: RuntimeEvent = {
    ...events["magic-link"],
    hasPush: true,
    renderPush: () => ({ body: "Body", title: "Title" }),
  };

  it("adds a push step for an event that has a push message", async () => {
    const found = await buildWorkflow(
      "with-push",
      withPush,
      BASE_URL
    ).discover();
    expect(found.steps.map((step) => step.type)).toEqual(["email", "push"]);
  });

  it("uses the id it is given and the event's data schema", async () => {
    const custom: RuntimeEvent = {
      ...events["magic-link"],
      payload: z.object({ x: z.string() }),
    };
    const found = await buildWorkflow("custom", custom, BASE_URL).discover();
    expect(found.workflowId).toBe("custom");
  });
});
