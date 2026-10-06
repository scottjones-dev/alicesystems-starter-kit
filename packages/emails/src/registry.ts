import type { ComponentType } from "react";
import { createElement } from "react";
import type { RenderedEmail } from "./render";
import { renderElement } from "./render";
import type { DeleteAccountProps } from "./templates/delete-account";
import DeleteAccount, {
  deleteAccountSubject,
} from "./templates/delete-account";
import type { MagicLinkProps } from "./templates/magic-link";
import MagicLink, { magicLinkSubject } from "./templates/magic-link";
import type { OrganizationInvitationProps } from "./templates/organization-invitation";
import OrganizationInvitation, {
  organizationInvitationSubject,
} from "./templates/organization-invitation";
import type { ResetPasswordProps } from "./templates/reset-password";
import ResetPassword, {
  resetPasswordSubject,
} from "./templates/reset-password";
import type { VerifyEmailProps } from "./templates/verify-email";
import VerifyEmail, { verifyEmailSubject } from "./templates/verify-email";
import type { EmailBaseProps } from "./types";

/** The props of every email, by id. Add a template here, and to `registry` below. */
export interface EmailPropsMap {
  "delete-account": DeleteAccountProps;
  "magic-link": MagicLinkProps;
  "organization-invitation": OrganizationInvitationProps;
  "reset-password": ResetPasswordProps;
  "verify-email": VerifyEmailProps;
}

export type EmailId = keyof EmailPropsMap;

export interface EmailEntry<Props extends EmailBaseProps> {
  id: string;
  /** Example props, for the preview server and the tests. */
  previewProps: Props;
  render: (props: Props) => Promise<RenderedEmail>;
  subject: (props: Props) => string;
}

type EmailRegistry = { [Id in EmailId]: EmailEntry<EmailPropsMap[Id]> };

const define = <Props extends EmailBaseProps>(entry: {
  component: ComponentType<Props>;
  id: string;
  previewProps: NoInfer<Props>;
  subject: (props: Props) => string;
}): EmailEntry<Props> => ({
  id: entry.id,
  previewProps: entry.previewProps,
  render: (props) =>
    renderElement(createElement(entry.component, props), entry.subject(props)),
  subject: entry.subject,
});

export const registry: EmailRegistry = {
  "delete-account": define({
    component: DeleteAccount,
    id: "delete-account",
    previewProps: DeleteAccount.PreviewProps,
    subject: deleteAccountSubject,
  }),
  "magic-link": define({
    component: MagicLink,
    id: "magic-link",
    previewProps: MagicLink.PreviewProps,
    subject: magicLinkSubject,
  }),
  "organization-invitation": define({
    component: OrganizationInvitation,
    id: "organization-invitation",
    previewProps: OrganizationInvitation.PreviewProps,
    subject: organizationInvitationSubject,
  }),
  "reset-password": define({
    component: ResetPassword,
    id: "reset-password",
    previewProps: ResetPassword.PreviewProps,
    subject: resetPasswordSubject,
  }),
  "verify-email": define({
    component: VerifyEmail,
    id: "verify-email",
    previewProps: VerifyEmail.PreviewProps,
    subject: verifyEmailSubject,
  }),
};

export const emailIds = Object.keys(registry) as EmailId[];

/**
 * Renders one email to HTML, plain text and a subject, in the recipient's language.
 *
 * @example
 * const { html, text, subject } = await renderEmail("magic-link", {
 *   baseUrl: "https://app.example.com",
 *   expiresIn: { minutes: 15 },
 *   locale: user.locale,
 *   url,
 * });
 */
export const renderEmail = <Id extends EmailId>(
  id: Id,
  props: EmailPropsMap[Id]
): Promise<RenderedEmail> => registry[id].render(props);
