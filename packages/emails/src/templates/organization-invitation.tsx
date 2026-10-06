import { Heading, Text } from "@react-email/components";
import { getT } from "@repo/internationalization/core";
import { formatDuration } from "@repo/internationalization/format";

import { EmailAction } from "../components/action";
import { EmailLayout } from "../components/layout";
import { styles } from "../styles";
import type { EmailBaseProps, EmailDuration } from "../types";

export interface OrganizationInvitationProps extends EmailBaseProps {
  expiresIn: EmailDuration;
  /** Who sent the invitation. */
  inviterName: string;
  /** The organization (tenant) the person is invited to. */
  organizationName: string;
  /** The role offered, written as the platform names it (for example "member"). */
  role: string;
  /** The accept-invitation link. */
  url: string;
}

export const organizationInvitationSubject = ({
  inviterName,
  locale,
  organizationName,
}: OrganizationInvitationProps) =>
  getT(locale, "emails")("organizationInvitation.subject", {
    inviter: inviterName,
    organization: organizationName,
  });

const OrganizationInvitation = ({
  baseUrl,
  expiresIn,
  inviterName,
  locale,
  organizationName,
  role,
  url,
}: OrganizationInvitationProps) => {
  const t = getT(locale, "emails");
  const names = { inviter: inviterName, organization: organizationName, role };

  return (
    <EmailLayout
      baseUrl={baseUrl}
      locale={locale}
      preview={t("organizationInvitation.preview", names)}
    >
      <Heading as="h1" style={styles.heading}>
        {t("organizationInvitation.heading", names)}
      </Heading>
      <Text style={styles.paragraph}>
        {t("organizationInvitation.body", names)}
      </Text>
      <EmailAction
        label={t("organizationInvitation.button")}
        locale={locale}
        url={url}
      />
      <Text style={styles.small}>
        {t("organizationInvitation.expiry", {
          duration: formatDuration(expiresIn, locale),
        })}{" "}
        {t("common.ignoreIfNotYou")}
      </Text>
    </EmailLayout>
  );
};

OrganizationInvitation.PreviewProps = {
  baseUrl: "https://example.com",
  expiresIn: { days: 7 },
  inviterName: "Sam Rivera",
  organizationName: "Acme Nursery",
  role: "member",
  url: "https://example.com/accept-invitation/preview",
} satisfies OrganizationInvitationProps;

export default OrganizationInvitation;
