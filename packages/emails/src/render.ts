import { render } from "@react-email/render";
import type { ReactElement } from "react";

export interface RenderedEmail {
  html: string;
  subject: string;
  /** The plain-text version, for mail clients that show text and for spam filters. */
  text: string;
}

export const renderElement = async (
  element: ReactElement,
  subject: string
): Promise<RenderedEmail> => {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { html, subject, text };
};
