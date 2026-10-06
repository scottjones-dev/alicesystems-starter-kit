import { Heading, Text } from "@react-email/components";
import { getT } from "@repo/internationalization/core";
import { formatDuration } from "@repo/internationalization/format";

import { EmailAction } from "../components/action";
import { EmailLayout } from "../components/layout";
import { styles } from "../styles";
import type { EmailBaseProps, EmailDuration } from "../types";

export interface VerifyEmailProps extends EmailBaseProps {
  expiresIn: EmailDuration;
  /** The recipient's name, for the greeting. */
  name: string;
  /** The verification link. */
  url: string;
}

export const verifyEmailSubject = ({ locale }: VerifyEmailProps) =>
  getT(locale, "emails")("verifyEmail.subject");

const VerifyEmail = ({
  baseUrl,
  expiresIn,
  locale,
  name,
  url,
}: VerifyEmailProps) => {
  const t = getT(locale, "emails");

  return (
    <EmailLayout
      baseUrl={baseUrl}
      locale={locale}
      preview={t("verifyEmail.preview")}
    >
      <Heading as="h1" style={styles.heading}>
        {t("verifyEmail.heading")}
      </Heading>
      <Text style={styles.paragraph}>{t("common.greeting", { name })}</Text>
      <Text style={styles.paragraph}>{t("verifyEmail.body")}</Text>
      <EmailAction label={t("verifyEmail.button")} locale={locale} url={url} />
      <Text style={styles.small}>
        {t("verifyEmail.expiry", {
          duration: formatDuration(expiresIn, locale),
        })}{" "}
        {t("common.ignoreIfNotYou")}
      </Text>
    </EmailLayout>
  );
};

VerifyEmail.PreviewProps = {
  baseUrl: "https://example.com",
  expiresIn: { hours: 24 },
  name: "Alex",
  url: "https://example.com/verify-email?token=preview",
} satisfies VerifyEmailProps;

export default VerifyEmail;
