import { Button, Link, Text } from "@react-email/components";
import { getT } from "@repo/internationalization/core";

import { styles } from "../styles";

interface EmailActionProps {
  /** The button text. */
  label: string;
  locale?: string;
  /** Where the button leads: the one thing the email asks the person to do. */
  url: string;
}

/**
 * The button, and below it the same link as text, because buttons break in some clients
 * (and in the plain-text version the link is all there is).
 */
export const EmailAction = ({ label, locale, url }: EmailActionProps) => {
  const t = getT(locale, "emails");

  return (
    <>
      <Button href={url} style={styles.button}>
        {label}
      </Button>
      <Text style={styles.small}>{t("common.buttonFallback")}</Text>
      <Text style={styles.url}>
        <Link href={url} style={{ color: styles.url.color }}>
          {url}
        </Link>
      </Text>
    </>
  );
};
