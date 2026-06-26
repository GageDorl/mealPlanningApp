import { ScrollView, View, Text, StyleSheet, Pressable, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius, MaxContentWidth } from '@/constants/theme';
import { Button } from '@/components/ui/button';
import { FatSecretAttribution } from '@/components/food/fatsecret-attribution';

const FEATURES = [
  {
    icon: 'calendar-outline' as const,
    title: 'Meal Planning',
    desc: 'Plan your week with a visual calendar. Drag, drop, and stay on track.',
  },
  {
    icon: 'search-outline' as const,
    title: 'Food Logging',
    desc: 'Search millions of foods, scan barcodes, or log from your personal library.',
  },
  {
    icon: 'stats-chart-outline' as const,
    title: 'Macro Tracking',
    desc: 'Hit your nutrition goals with real-time macro breakdowns for every day.',
  },
  {
    icon: 'basket-outline' as const,
    title: 'Grocery Lists',
    desc: 'Auto-generate shopping lists from your planned meals — no manual entry needed.',
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Prepd</Text>
        <Text style={styles.heroTagline}>Plan smarter. Eat better.</Text>
        <Text style={styles.heroDesc}>
          Your all-in-one meal planner, food logger, and grocery list — built for real life.
        </Text>
      </View>

      {/* Body */}
      <View style={[styles.body, { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' }]}>

        {/* CTAs */}
        <View style={styles.ctaRow}>
          <View style={styles.ctaHalf}>
            <Button label="Get Started" onPress={() => router.push('/sign-up')} />
          </View>
          <View style={styles.ctaHalf}>
            <Button label="Sign In" onPress={() => router.push('/sign-in')} variant="secondary" />
          </View>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map(f => (
            <View
              key={f.icon}
              style={[styles.featureCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${Colors.accent}1A` }]}>
                <Ionicons name={f.icon} size={24} color={Colors.accent} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <FatSecretAttribution />
          <View style={styles.legalLinks}>
            <Pressable onPress={() => router.push('/privacy-policy')} style={styles.legalLink}>
              <Text style={[styles.legalText, { color: theme.textSecondary }]}>Privacy Policy</Text>
            </Pressable>
            <Text style={[styles.legalSep, { color: theme.textSecondary }]}>·</Text>
            <Pressable onPress={() => router.push('/terms-of-service')} style={styles.legalLink}>
              <Text style={[styles.legalText, { color: theme.textSecondary }]}>Terms of Service</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  } as ViewStyle,
  hero: {
    backgroundColor: Colors.accent,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  } as ViewStyle,
  heroTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  } as TextStyle,
  heroTagline: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: Spacing.md,
  } as TextStyle,
  heroDesc: {
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  } as TextStyle,
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xxl,
  } as ViewStyle,
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  } as ViewStyle,
  ctaHalf: {
    flex: 1,
  } as ViewStyle,
  features: {
    gap: Spacing.md,
  } as ViewStyle,
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  } as ViewStyle,
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  featureText: {
    flex: 1,
    gap: Spacing.xs,
  } as ViewStyle,
  featureTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  featureDesc: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  footer: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  } as ViewStyle,
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  legalLink: {
    paddingVertical: Spacing.xs,
  } as ViewStyle,
  legalText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  legalSep: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});
