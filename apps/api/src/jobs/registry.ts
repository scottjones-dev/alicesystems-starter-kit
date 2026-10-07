import type { AnyJob } from "@repo/jobs/define";

/**
 * Every background job this API runs, listed once. Jobs are defined next to the code they
 * belong to (`defineJob`) and added here. See packages/jobs/README.md for an example.
 *
 * Nothing is listed yet: the template has no job of its own, and a placeholder that does
 * nothing would only be something to delete. The queue still starts, so adding the first job
 * is one line here.
 */
export const jobs: readonly AnyJob[] = [];
