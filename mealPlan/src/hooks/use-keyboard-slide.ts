import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Returns translateY (an Animated.Value for a bottom sheet — negative when the keyboard is
// visible, 0 when hidden) and maxHeight (a pixel cap for that sheet's height/maxHeight style
// while the keyboard is visible, undefined otherwise). Sheets translate up by the keyboard
// height, so without a cap a sheet close to full screen height would get pushed above the top
// of the screen; maxHeight keeps it within the space still visible above the keyboard.
export function useKeyboardSlide() {
  const translateY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const bottomInsetRef = useRef(insets.bottom);
  bottomInsetRef.current = insets.bottom;
  const { height: windowHeight } = useWindowDimensions();
  // Adjusted height (endCoordinates.height minus the bottom safe-area inset), not the raw
  // keyboard height — already the same value used for translateY, don't subtract the inset again.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Bumped on every keyboard event so a hide animation's completion callback can tell
  // whether it's still the latest transition before releasing the height cap.
  const transitionEpoch = useRef(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // e.endCoordinates.height is measured from the bottom of the screen, which already
        // includes the bottom safe-area inset (nav bar / home indicator) that the sheet's own
        // bottom padding accounts for — subtract it so the sheet doesn't slide up further than
        // the keyboard actually requires. Clamp at 0 so a smaller-than-inset keyboard height
        // (some devices/orientations) can't flip this positive and slide the sheet down instead.
        const adjusted = Math.max(0, e.endCoordinates.height - bottomInsetRef.current);
        transitionEpoch.current++;
        setKeyboardHeight(adjusted);
        Animated.timing(translateY, {
          toValue: -adjusted,
          duration: Platform.OS === 'ios' ? e.duration : 150,
          useNativeDriver: true,
        }).start();
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        // Keep the height cap in place until the slide-down finishes — releasing it
        // immediately makes the sheet snap to its full height while the translate is
        // still animating, which reads as a jitter. Only release if no newer keyboard
        // transition (e.g. focus moved to another input) started in the meantime.
        const epoch = ++transitionEpoch.current;
        Animated.timing(translateY, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration : 150,
          useNativeDriver: true,
        }).start(() => {
          if (transitionEpoch.current === epoch) setKeyboardHeight(0);
        });
      }
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [translateY]);

  return {
    translateY,
    maxHeight: keyboardHeight > 0 ? Math.max(0, windowHeight - keyboardHeight) : undefined,
  };
}
