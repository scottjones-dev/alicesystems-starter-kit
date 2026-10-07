import { keys } from "@repo/observability/keys";
import type { ServiceState } from "@repo/observability/status";
import { getServiceStatus } from "@repo/observability/status";

/** How often the page may refresh the status: often enough to be useful, rarely enough to be cheap. */
const REVALIDATE_SECONDS = 60;

// Written in English for now: the website has no translated text yet (see @repo/internationalization).
// The dot colours use Tailwind's palette because the theme has no success or warning colour.
const PRESENTATION: Record<ServiceState, { dot: string; label: string }> = {
  degraded: { dot: "bg-destructive", label: "Degraded performance" },
  normal: { dot: "bg-emerald-500", label: "All systems normal" },
  partial: { dot: "bg-amber-500", label: "Partial outage" },
  unknown: { dot: "bg-muted-foreground", label: "Status unavailable" },
};

/**
 * A small "all systems normal" indicator that links to the status page. Shows nothing when
 * Better Stack is not set up, so a fresh checkout has no empty footer or broken link.
 */
export async function ServiceStatus() {
  const { BETTERSTACK_STATUS_URL: statusUrl, BETTERSTACK_UPTIME_TOKEN: token } =
    keys.env();
  const status = await getServiceStatus({
    requestInit: { next: { revalidate: REVALIDATE_SECONDS } } as RequestInit,
    statusUrl,
    token,
  });
  if (!status) {
    return null;
  }

  const { dot, label } = PRESENTATION[status.state];
  const content = (
    <>
      <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />
      <span>{label}</span>
    </>
  );
  const className = "flex items-center gap-2 text-muted-foreground text-sm";

  return status.url ? (
    <a
      className={className}
      href={status.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {content}
    </a>
  ) : (
    <p className={className}>{content}</p>
  );
}
