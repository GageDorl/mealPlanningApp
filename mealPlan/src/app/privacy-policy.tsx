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

export default function PrivacyPolicyScreen() {
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
      </View>

      <View style={[styles.content, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}>
        <Text style={[styles.effectiveDate, { color: theme.textSecondary }]}>
          Effective date: {EFFECTIVE_DATE}
        </Text>

        <Body>
          Prepd ("we", "our", or "us") is committed to protecting your personal information. This
          Privacy Policy explains what data we collect, how we use it, and your rights regarding
          that data.
        </Body>

        <Section title="1. Information We Collect">
          <Body>When you create an account and use Prepd, we collect:</Body>
          <Bullet>Account information: your email address and display name</Bullet>
          <Bullet>Meal plans: recipes and meals you schedule on the calendar</Bullet>
          <Bullet>Food logs: foods, quantities, and times you log each day</Bullet>
          <Bullet>Nutrition goals: calorie and macro targets you set</Bullet>
          <Bullet>Weight logs: weight entries you record (if any)</Bullet>
          <Bullet>Personal food library: custom foods and recipes you create</Bullet>
          <Bullet>App preferences: theme setting and other display preferences</Bullet>
          <Bullet>Google Calendar data: calendar events created or managed through the app (only if you connect Google Calendar)</Bullet>
        </Section>

        <Section title="2. How We Use Your Information">
          <Body>We use your data solely to provide and improve Prepd:</Body>
          <Bullet>Syncing your meal plans and food logs across devices</Bullet>
          <Bullet>Calculating and displaying your daily macro and calorie totals</Bullet>
          <Bullet>Generating grocery lists from your planned meals</Bullet>
          <Bullet>Exporting meal events to your Google Calendar (only when you explicitly request it)</Bullet>
          <Body>
            We do not sell, rent, or share your personal data with third parties for advertising or
            marketing purposes.
          </Body>
        </Section>

        <Section title="3. Google Calendar API">
          <Body>
            If you choose to connect your Google Calendar, Prepd requests permission to create and
            manage calendar events on your behalf. Specifically:
          </Body>
          <Bullet>We only access the Google Calendar scopes you explicitly authorize</Bullet>
          <Bullet>We only write events you request to export from the app</Bullet>
          <Bullet>We do not read, store, or analyze your existing calendar events</Bullet>
          <Bullet>You can disconnect Google Calendar at any time from the Profile screen</Bullet>
          <Body>
            Prepd's use and transfer of information received from Google APIs adheres to the Google
            API Services User Data Policy, including the Limited Use requirements.
          </Body>
        </Section>

        <Section title="4. Third-Party Services">
          <Body>Prepd uses the following third-party services to operate:</Body>
          <Bullet>Supabase — cloud database and authentication (data stored in the United States)</Bullet>
          <Bullet>PowerSync — offline sync layer that caches your data on-device</Bullet>
          <Bullet>FatSecret Platform API — nutrition data for food search results</Bullet>
          <Bullet>Google Calendar API — optional calendar integration</Bullet>
          <Body>
            Each service operates under its own privacy policy. Nutrition data retrieved through the
            FatSecret Platform API is used solely to display food information within the app.
          </Body>
        </Section>

        <Section title="5. Data Storage and Security">
          <Body>
            Your data is stored on Supabase-managed servers located in the United States. We use
            row-level security to ensure each user can only access their own data. Data is also
            cached locally on your device to support offline use.
          </Body>
        </Section>

        <Section title="6. Data Retention and Deletion">
          <Body>
            We retain your data for as long as your account is active. If you wish to delete your
            account and all associated data, please contact us at the email address below. We will
            process deletion requests within 30 days.
          </Body>
        </Section>

        <Section title="7. Children's Privacy">
          <Body>
            Prepd is not directed at children under the age of 13. We do not knowingly collect
            personal information from children. If you believe a child has provided us with their
            information, please contact us and we will delete it promptly.
          </Body>
        </Section>

        <Section title="8. Changes to This Policy">
          <Body>
            We may update this Privacy Policy from time to time. When we do, we will update the
            effective date above. Continued use of the app after changes constitutes acceptance of
            the updated policy.
          </Body>
        </Section>

        <Section title="9. Contact Us">
          <Body>
            If you have any questions about this Privacy Policy or want to request data deletion,
            please contact:
          </Body>
          <View style={[styles.contactCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.contactName, { color: theme.text }]}>Prepd</Text>
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
