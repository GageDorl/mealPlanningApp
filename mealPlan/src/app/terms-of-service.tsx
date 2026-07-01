import { ScrollView, View, Text, StyleSheet, Pressable, Linking, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';

const EFFECTIVE_DATE = 'June 26, 2026';
const CONTACT_EMAIL = 'dorlandotech@gmail.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={[styles.body, { color: theme.textSecondary }]}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color: Colors.accent }]}>{'•'}</Text>
      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{children}</Text>
    </View>
  );
}

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Terms of Service</Text>
      </View>

      <View style={[styles.content, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}>
        <Text style={[styles.effectiveDate, { color: theme.textSecondary }]}>
          Effective date: {EFFECTIVE_DATE}
        </Text>

        <Body>
          These Terms of Service ("Terms") govern your use of Bento, a meal planning and nutrition
          tracking application operated by Bento ("we", "our", or "us"). By creating an account or
          using the app, you agree to these Terms.
        </Body>

        <Section title="1. Eligibility">
          <Body>
            You must be at least 13 years old to use Bento. By using the app, you represent that
            you meet this requirement. If you are under 18, you must have permission from a parent
            or guardian.
          </Body>
        </Section>

        <Section title="2. Your Account">
          <Body>
            You are responsible for maintaining the security of your account credentials. You agree
            to:
          </Body>
          <Bullet>Provide accurate information when creating your account</Bullet>
          <Bullet>Keep your password confidential and not share it with others</Bullet>
          <Bullet>Notify us promptly if you suspect unauthorized access to your account</Bullet>
          <Bullet>Accept responsibility for all activity that occurs under your account</Bullet>
          <Body>
            We reserve the right to suspend or terminate accounts that violate these Terms.
          </Body>
        </Section>

        <Section title="3. Acceptable Use">
          <Body>You agree to use Bento only for its intended purpose. You may not:</Body>
          <Bullet>Use the app for any unlawful purpose or in violation of any applicable laws</Bullet>
          <Bullet>Attempt to gain unauthorized access to our systems or another user's account</Bullet>
          <Bullet>Reverse-engineer, decompile, or otherwise attempt to extract the source code</Bullet>
          <Bullet>Interfere with or disrupt the availability or integrity of the service</Bullet>
          <Bullet>Use automated tools to scrape, crawl, or extract data from the app</Bullet>
        </Section>

        <Section title="4. Google API Services">
          <Body>
            Bento offers optional integration with Google Calendar. When you connect your Google
            account, you authorize Bento to create and manage calendar events on your behalf using
            the Google Calendar API. By using this integration:
          </Body>
          <Bullet>You agree to Google's Terms of Service (https://policies.google.com/terms)</Bullet>
          <Bullet>You grant Bento permission to access only the Google Calendar scopes you authorize</Bullet>
          <Bullet>You can revoke this access at any time from the Profile screen or from your Google account settings</Bullet>
          <Body>
            Bento's use of data received from Google APIs adheres to the Google API Services User
            Data Policy, including the Limited Use requirements. We do not use Google user data for
            advertising, profiling, or any purpose beyond operating the calendar integration feature.
          </Body>
        </Section>

        <Section title="5. Content You Provide">
          <Body>
            You retain ownership of any content you create in Bento — including meal plans, custom
            recipes, and food logs. By using the app, you grant us a limited license to store and
            process this content solely to provide the service to you.
          </Body>
          <Body>
            You are responsible for ensuring that any content you submit (such as custom food
            entries shared to the community database) does not infringe the rights of any third
            party.
          </Body>
        </Section>

        <Section title="6. Third-Party Services">
          <Body>
            Bento integrates with third-party services including Supabase (database and
            authentication), PowerSync (offline sync), and the FatSecret Platform API (nutrition
            data). Your use of these services is subject to their respective terms and privacy
            policies. We are not responsible for the practices or content of third-party services.
          </Body>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <Body>
            Bento is provided "as is" and "as available" without warranties of any kind, either
            express or implied. We do not warrant that the service will be uninterrupted, error-free,
            or free of harmful components. Nutrition data provided through the FatSecret Platform API
            is informational only and should not be used as a substitute for professional medical or
            dietary advice.
          </Body>
        </Section>

        <Section title="8. Limitation of Liability">
          <Body>
            To the maximum extent permitted by applicable law, Bento and its operators shall not be
            liable for any indirect, incidental, special, or consequential damages arising from your
            use of or inability to use the service, even if we have been advised of the possibility
            of such damages.
          </Body>
        </Section>

        <Section title="9. Termination">
          <Body>
            You may stop using Bento and delete your account at any time from the Profile screen
            under "Danger zone." Account deletion is immediate and irreversible and removes all
            your data from our systems.
          </Body>
          <Body>
            We may suspend or terminate your access to the service at any time if you violate
            these Terms or for any other reason at our discretion, with or without notice.
          </Body>
        </Section>

        <Section title="10. Changes to These Terms">
          <Body>
            We may update these Terms from time to time. When we do, we will update the effective
            date above. Your continued use of Bento after changes are posted constitutes your
            acceptance of the revised Terms.
          </Body>
        </Section>

        <Section title="11. Contact Us">
          <Body>
            If you have any questions about these Terms, please contact:
          </Body>
          <View style={[styles.contactCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.contactName, { color: theme.text }]}>Bento</Text>
            <Pressable onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
              <Text style={[styles.contactEmail, { color: Colors.accent }]}>{CONTACT_EMAIL}</Text>
            </Pressable>
          </View>
        </Section>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: Spacing.xxxl,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  } as ViewStyle,
  backBtn: {
    padding: Spacing.xs,
  } as ViewStyle,
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  } as TextStyle,
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.xl,
  } as ViewStyle,
  effectiveDate: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  section: {
    gap: Spacing.sm,
  } as ViewStyle,
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  } as TextStyle,
  body: {
    fontSize: FontSizes.sm,
    lineHeight: 22,
  } as TextStyle,
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
  } as ViewStyle,
  bulletDot: {
    fontSize: FontSizes.sm,
    lineHeight: 22,
  } as TextStyle,
  bulletText: {
    flex: 1,
    fontSize: FontSizes.sm,
    lineHeight: 22,
  } as TextStyle,
  contactCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  } as ViewStyle,
  contactName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  contactEmail: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});
