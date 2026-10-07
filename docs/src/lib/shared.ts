import { createGetUrl } from "fumadocs-core/source";
import { i18n } from "./i18n";

export const appName = "StarterKit Docs";
export const siteDescription =
  "A monorepo starter with a Next.js website, an Expo app and a Hono API already wired to accounts, a database, emails, analytics and error reporting.";
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";
export const docsContentRoute = "/llms.mdx/docs";

// Where this site's source lives on GitHub. `contentPath` is the pages' folder from the repo
// root (this site is one workspace in a monorepo), so change it if the folder moves.
export const gitConfig = {
  branch: "master",
  contentPath: "docs/content/docs",
  repo: "alicesystems-starter-kit",
  user: "scottjones-dev",
};

/** The GitHub repository, for the header icon and the landing page. */
export const githubRepoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

/** The GitHub link to a page's source file. `page.path` is relative to the content folder. */
export function getPageGithubUrl(page: { path: string }) {
  const { branch, contentPath, repo, user } = gitConfig;

  return `https://github.com/${user}/${repo}/blob/${branch}/${contentPath}/${page.path}`;
}

const getContentUrl = createGetUrl(docsContentRoute, i18n);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "content.md"];

  return { segments, url: getContentUrl(segments, page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute, i18n);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "image.png"];

  return { segments, url: getImageUrl(segments, page.locale) };
}
