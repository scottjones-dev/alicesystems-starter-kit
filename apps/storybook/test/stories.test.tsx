import { readdirSync } from "node:fs";
import path from "node:path";

import { TooltipProvider } from "@repo/ui/components/tooltip";
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { cleanup, render } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/*
 * Renders every story, so a component that crashes, or a story that no longer matches its
 * component, fails here instead of being found in the browser. It also fails when a component
 * is added to @repo/ui (with `shadcn add`) without a story.
 */

type StoryModule = Parameters<typeof composeStories>[0];

/** Every story is filed under the "ui" group in the sidebar. */
const UI_TITLE_PATTERN = /^ui\//u;

const storiesDir = path.join(import.meta.dirname, "..", "stories");
const componentsDir = path.join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "packages",
  "ui",
  "src",
  "components"
);

const namesIn = (dir: string, suffix: string) =>
  readdirSync(dir)
    .filter((file) => file.endsWith(suffix))
    .map((file) => file.slice(0, -suffix.length))
    .toSorted();

const storyNames = namesIn(storiesDir, ".stories.tsx");
const componentNames = namesIn(componentsDir, ".tsx");

beforeAll(() => {
  // The one provider the preview adds that a story needs to run (the theme toggle is not needed).
  setProjectAnnotations({
    decorators: [
      (Story) => (
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      ),
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the stories", () => {
  it("cover every component in @repo/ui", () => {
    expect(storyNames).toEqual(componentNames);
  });

  it("are not empty", () => {
    expect(storyNames.length).toBeGreaterThanOrEqual(20);
  });

  describe.each(storyNames)("%s", (name) => {
    it("is titled under ui/ and documented automatically", async () => {
      const module = (await import(`../stories/${name}.stories.tsx`)) as {
        default: { tags?: string[]; title?: string };
      };
      expect(module.default.title).toMatch(UI_TITLE_PATTERN);
      expect(module.default.tags).toContain("autodocs");
    });

    it("renders every story without errors", async () => {
      const error = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const module = (await import(
        `../stories/${name}.stories.tsx`
      )) as StoryModule;
      // SAFETY: composed stories are React components that render with no props.
      const stories = Object.values(composeStories(module)) as ComponentType[];
      expect(stories.length).toBeGreaterThan(0);
      for (const Story of stories) {
        const { container, unmount } = render(<Story />);
        expect(
          container.innerHTML.length + document.body.innerHTML.length
        ).toBeGreaterThan(0);
        unmount();
      }
      expect(error).not.toHaveBeenCalled();
    });
  });
});
