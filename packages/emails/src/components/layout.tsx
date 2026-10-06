import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { app } from "@repo/config/app";
import { getT } from "@repo/internationalization/core";
import { intlLocale } from "@repo/internationalization/format";
import type { ReactNode } from "react";

import { EMAIL_COLOR_SCHEME, styles } from "../styles";

interface EmailLayoutProps {
  baseUrl: string;
  children: ReactNode;
  /** The recipient's language; English when left out. */
  locale?: string;
  /** The short text some inboxes show next to the subject. */
  preview: string;
}

/** The frame every email shares: brand name, the card, and a footer with help and legal links. */
export const EmailLayout = ({
  baseUrl,
  children,
  locale,
  preview,
}: EmailLayoutProps) => {
  const t = getT(locale, "emails");

  return (
    <Html lang={intlLocale(locale)}>
      <Head>
        {/* One look (see EMAIL_COLOR_SCHEME): ask mail clients not to recolour the email. */}
        <meta content={`${EMAIL_COLOR_SCHEME} only`} name="color-scheme" />
        <meta
          content={`${EMAIL_COLOR_SCHEME} only`}
          name="supported-color-schemes"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>{app.name}</Text>
          <Section style={styles.card}>{children}</Section>
          <Section style={{ paddingTop: "20px" }}>
            <Text style={styles.footerText}>
              {t("common.questions", { email: app.email.replyTo })}
            </Text>
            <Text style={styles.footerText}>
              <Link
                href={`${baseUrl}${app.links.privacy}`}
                style={styles.footerLink}
              >
                {t("common.privacy")}
              </Link>
              {" · "}
              <Link
                href={`${baseUrl}${app.links.terms}`}
                style={styles.footerLink}
              >
                {t("common.terms")}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
