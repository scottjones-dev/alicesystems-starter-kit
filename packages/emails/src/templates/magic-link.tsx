import { Heading, Text } from "@react-email/components";
import { getT } from "@repo/internationalization/core";
import { formatDuration } from "@repo/internationalization/format";

import { EmailAction } from "../components/action";
import { EmailLayout } from "../components/layout";
import { styles } from "../styles";
import type { EmailBaseProps, EmailDuration } from "../types";

export interface MagicLinkProps extends EmailBaseProps {
  expiresIn: EmailDuration;
  /** The sign-in link. It works once. */
  url: string;
}

export const magicLinkSubject = ({ locale }: MagicLinkProps) =>
  getT(locale, "emails")("magicLink.subject");

const MagicLink = ({ baseUrl, expiresIn, locale, url }: MagicLinkProps) => {
  const t = getT(locale, "emails");

  return (
    <EmailLayout
      baseUrl={baseUrl}
      locale={locale}
      preview={t("magicLink.preview")}
    >
      <Heading as="h1" style={styles.heading}>
        {t("magicLink.heading")}
      </Heading>
      <Text style={styles.paragraph}>{t("magicLink.body")}</Text>
      <EmailAction label={t("magicLink.button")} locale={locale} url={url} />
      <Text style={styles.small}>
        {t("magicLink.expiry", {
          duration: formatDuration(expiresIn, locale),
        })}{" "}
        {t("common.ignoreIfNotYou")}
      </Text>
    </EmailLayout>
  );
};

MagicLink.PreviewProps = {
  baseUrl: "https://example.com",
  expiresIn: { minutes: 15 },
  url: "https://example.com/magic-link?token=preview",
} satisfies MagicLinkProps;

export default MagicLink;
