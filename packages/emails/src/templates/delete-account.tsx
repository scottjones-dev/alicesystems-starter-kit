import { Heading, Text } from "@react-email/components";
import { getT } from "@repo/internationalization/core";
import { formatDuration } from "@repo/internationalization/format";

import { EmailAction } from "../components/action";
import { EmailLayout } from "../components/layout";
import { styles } from "../styles";
import type { EmailBaseProps, EmailDuration } from "../types";

export interface DeleteAccountProps extends EmailBaseProps {
  expiresIn: EmailDuration;
  /** The recipient's name, for the greeting. */
  name: string;
  /** The link that confirms the deletion. */
  url: string;
}

export const deleteAccountSubject = ({ locale }: DeleteAccountProps) =>
  getT(locale, "emails")("deleteAccount.subject");

const DeleteAccount = ({
  baseUrl,
  expiresIn,
  locale,
  name,
  url,
}: DeleteAccountProps) => {
  const t = getT(locale, "emails");

  return (
    <EmailLayout
      baseUrl={baseUrl}
      locale={locale}
      preview={t("deleteAccount.preview")}
    >
      <Heading as="h1" style={styles.heading}>
        {t("deleteAccount.heading")}
      </Heading>
      <Text style={styles.paragraph}>{t("common.greeting", { name })}</Text>
      <Text style={styles.paragraph}>{t("deleteAccount.body")}</Text>
      <Text style={styles.warning}>{t("deleteAccount.warning")}</Text>
      <EmailAction
        label={t("deleteAccount.button")}
        locale={locale}
        url={url}
      />
      <Text style={styles.small}>
        {t("deleteAccount.expiry", {
          duration: formatDuration(expiresIn, locale),
        })}{" "}
        {t("common.ignoreIfNotYou")}
      </Text>
    </EmailLayout>
  );
};

DeleteAccount.PreviewProps = {
  baseUrl: "https://example.com",
  expiresIn: { hours: 1 },
  name: "Alex",
  url: "https://example.com/delete-account?token=preview",
} satisfies DeleteAccountProps;

export default DeleteAccount;
