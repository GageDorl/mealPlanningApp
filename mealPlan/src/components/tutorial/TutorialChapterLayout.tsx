import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { TutorialSlideView } from './TutorialSlideView';
import { TooltipCard } from './TooltipCard';
import { MacroGoalsSetup } from './setup/MacroGoalsSetup';
import { DietaryPreferencesSetup } from './setup/DietaryPreferencesSetup';
import { CalendarConnectSetup } from './setup/CalendarConnectSetup';
import type { TutorialChapter, TooltipData } from '@/types/tutorial';

interface Props {
  chapter: TutorialChapter;
  onChapterComplete: () => void;
  onSkipTutorial?: () => void;
  renderAction?: (key: string, onComplete: () => void, onSkip?: () => void) => React.ReactNode;
}

export function TutorialChapterLayout({ chapter, onChapterComplete, onSkipTutorial, renderAction }: Props) {
  const theme = useTheme();
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideAreaY, setSlideAreaY] = useState(0);
  const [actionTooltip, setActionTooltip] = useState<TooltipData | null>(null);

  const slide = chapter.slides[slideIndex];
  const isFirst = slideIndex === 0;
  const isLast = slideIndex === chapter.slides.length - 1;

  const advance = () => {
    if (isLast) {
      onChapterComplete();
    } else {
      setSlideIndex((i) => i + 1);
    }
  };

  const retreat = () => {
    if (!isFirst) setSlideIndex((i) => i - 1);
  };

  const resolveAction = (key: string, onComplete: () => void, onSkip?: () => void) => {
    if (renderAction) return renderAction(key, onComplete, onSkip);
    switch (key) {
      case 'macro-goals': return <MacroGoalsSetup onComplete={onComplete} onTooltipChange={setActionTooltip} />;
      case 'dietary-prefs': return <DietaryPreferencesSetup onComplete={onComplete} />;
      case 'calendar-connect': return <CalendarConnectSetup onComplete={onComplete} onSkip={onSkip} />;
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Skip row — tutorial skip on left, chapter skip on right */}
      <View style={styles.skipRow}>
        {onSkipTutorial ? (
          <Pressable onPress={onSkipTutorial} hitSlop={8}>
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip tutorial</Text>
          </Pressable>
        ) : <View />}
        <Pressable onPress={onChapterComplete} hitSlop={8}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip chapter</Text>
        </Pressable>
      </View>

      {/* For action slides: show the slide title + body as context before the form */}
      {slide.type === 'action' && (
        <View style={[styles.actionIntro, { borderBottomColor: theme.border }]}>
          <Text style={[styles.actionIntroTitle, { color: theme.text }]}>{slide.title}</Text>
          <Text style={[styles.actionIntroBody, { color: theme.textSecondary }]}>{slide.body}</Text>
        </View>
      )}

      {/* Main slide content */}
      <View style={styles.slideArea} onLayout={(e) => setSlideAreaY(e.nativeEvent.layout.y)}>
        {slide.type === 'action'
          ? resolveAction(slide.componentKey, advance, slide.skippable ? advance : undefined)
          : <TutorialSlideView slide={slide} key={slide.illustrationKey ?? slide.title} />}
      </View>

      {/* Skip this step — outside slideArea so it's always visible */}
      {slide.type === 'action' && slide.skippable && (
        <Pressable onPress={advance} style={styles.skipStepButton} hitSlop={8}>
          <Text style={[styles.skipStepText, { color: theme.textSecondary }]}>Skip this step</Text>
        </Pressable>
      )}

      {/* Dot pagination */}
      <View style={styles.dots}>
        {chapter.slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === slideIndex ? Colors.accent : theme.border },
              i === slideIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Back / Next nav */}
      <View style={[styles.nav, { borderTopColor: theme.border }]}>
        <Pressable
          onPress={retreat}
          disabled={isFirst}
          style={[
            styles.navButton,
            { backgroundColor: theme.backgroundElement },
            isFirst && styles.navButtonHidden,
          ]}
        >
          <Text style={[styles.navButtonText, { color: theme.text }]}>Back</Text>
        </Pressable>

        <Pressable
          onPress={advance}
          style={[styles.navButton, styles.nextButton, slide.type === 'action' && styles.navButtonHidden]}
        >
          <Text style={styles.nextButtonText}>{isLast ? 'Finish' : 'Next'}</Text>
        </Pressable>
      </View>
      {/* Rendered last → above skip/dots/nav regardless of JSX order */}
      {actionTooltip && (
        <View style={{ position: 'absolute', top: slideAreaY + actionTooltip.relativeY, left: 0, right: 0 }}>
          <TooltipCard
            step={actionTooltip.step}
            total={actionTooltip.total}
            title={actionTooltip.title}
            body={actionTooltip.body}
            onNext={actionTooltip.onNext}
            onDismiss={actionTooltip.onDismiss}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  } as ViewStyle,
  skipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  actionIntro: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  } as ViewStyle,
  actionIntroTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  actionIntroBody: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  slideArea: {
    flex: 1,
  } as ViewStyle,
  skipStepButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  } as ViewStyle,
  skipStepText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  } as TextStyle,
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  } as ViewStyle,
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  dotActive: {
    width: 18,
    borderRadius: 3,
  } as ViewStyle,
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  } as ViewStyle,
  navButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  } as ViewStyle,
  navButtonHidden: {
    opacity: 0,
    pointerEvents: 'none',
  } as ViewStyle,
  navButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  nextButton: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
});
