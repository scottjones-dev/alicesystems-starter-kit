import { Heading, Text } from "@react-email/components";
import { getT } from "@repo/internationalization/core";
import { formatDuration } from "@repo/internationalization/format";

import { EmailAction } from "../components/action";
import { EmailLayout } from "../components/layout";
import { styles } from "../styles";
import type { EmailBaseProps, EmailDuration } from "../types";

export interface ResetPasswordProps extends EmailBaseProps {
  expiresIn: EmailDuration;
  /** The recipient's name, for the greeting. */
  name: string;
  /** The link to choose a new password. */
  url: string;
}

export const resetPasswordSubject = ({ locale }: ResetPasswordProps) =>
  getT(locale, "emails")("resetPassword.subject");

const ResetPassword = ({
  baseUrl,
  expiresIn,
  locale,
  name,
  url,
}: ResetPasswordProps) => {
  const t = getT(locale, "emails");

  return (
    <EmailLayout
      baseUrl={baseUrl}
      locale={locale}
      preview={t("resetPassword.preview")}
    >
      <Heading as="h1" style={styles.heading}>
        {t("resetPassword.heading")}
      </Heading>
      <Text style={styles.paragraph}>{t("common.greeting", { name })}</Text>
      <Text style={styles.paragraph}>{t("resetPassword.body")}</Text>
      <EmailAction
        label={t("resetPassword.button")}
        locale={locale}
        url={url}
      />
      <Text style={styles.small}>
        {t("resetPassword.expiry", {
          duration: formatDuration(expiresIn, locale),
        })}{" "}
        {t("common.ignoreIfNotYou")}
      </Text>
    </EmailLayout>
  );
};

ResetPassword.PreviewProps = {
  baseUrl: "https://example.com",
  expiresIn: { hours: 1 },
  name: "Alex",
  url: "https://example.com/reset-password?token=preview",
} satisfies ResetPasswordProps;

export default ResetPassword;
