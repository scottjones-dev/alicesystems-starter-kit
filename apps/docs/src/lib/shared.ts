import { app } from "@repo/config/app";
import { createGetUrl } from "fumadocs-core/source";

export const appName = `${app.name} Docs`;
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";
export const docsContentRoute = "/llms.mdx/docs";

// Where this site's source lives on GitHub. `contentPath` is the pages' folder from the repo
// root (this site is one workspace in a monorepo), so change it if the folder moves.
export const gitConfig = {
  branch: "master",
  contentPath: "apps/docs/content/docs",
  repo: "alicesystems-starter-kit",
  user: "scottjones-dev",
};

/** The GitHub link to a page's source file. `page.path` is relative to the content folder. */
export function getPageGithubUrl(page: { path: string }) {
  const { branch, contentPath, repo, user } = gitConfig;

  return `https://github.com/${user}/${repo}/blob/${branch}/${contentPath}/${page.path}`;
}

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "content.md"];

  return { segments, url: getContentUrl(segments, page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "image.png"];

  return { segments, url: getImageUrl(segments, page.locale) };
}
