/** A length of time, written by the recipient's language: { minutes: 15 } is "15 minutes". */
export interface EmailDuration {
  days?: number;
  hours?: number;
  minutes?: number;
}

/** What every template needs, besides its own props. */
export interface EmailBaseProps {
  /**
   * The web address of the environment the email is sent from (scheme and host, no trailing
   * slash). Footer links are built from it, so a staging email never links to production.
   */
  baseUrl: string;
  /** The recipient's language, for example `de`. English when left out or not shipped. */
  locale?: string;
}
