# Calendar 2D Pan — Implementation Plan

Goal: replace nested ScrollViews (narrow/mobile path) with a single
PanGestureHandler + Animated.ValueXY so the user can pan diagonally.
Wide/web path keeps the existing vertical ScrollView unchanged.

---

## Files changed
- `src/app/calendar/index.tsx` — only file that needs changes

---

## Step 1 — Replace state/refs (DONE when all old refs are removed)

### Remove
```
const [scrollX, setScrollX] = useState(0);
const [horizontalViewportWidth, setHorizontalViewportWidth] = useState(0);
const verticalScrollRef = useRef<ScrollView>(null);
const horizontalScrollRef = useRef<ScrollView>(null);
```

### Add
```typescript
const panOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
const panCurrentXY = useRef({ x: 0, y: 0 });     // JS-side mirror for clamping
const [viewportWidth, setViewportWidth] = useState(0); // replaces horizontalViewportWidth
```

Keep: `scrollY`, `viewportHeight`, `hourHeight` and everything else.

---

## Step 2 — Add pan bounds helpers (place near gridHeight)

```typescript
const maxTranslateX = Math.min(0, viewportWidth - MOBILE_CALENDAR_WIDTH);
const maxTranslateY = Math.min(0, viewportHeight - gridHeight);
```

---

## Step 3 — Add panGesture (place after pinchZoomGesture)

```typescript
const panGesture = useMemo(() =>
  Gesture.Pan()
    .runOnJS(true)
    .minPointers(1)
    .maxPointers(1)
    .onBegin(() => {
      panOffset.stopAnimation();
      // sync mirror from last known position (already up-to-date via listener)
    })
    .onUpdate((e) => {
      const nx = Math.max(maxTranslateX, Math.min(0, panCurrentXY.current.x + e.changeX));
      const ny = Math.max(maxTranslateY, Math.min(0, panCurrentXY.current.y + e.changeY));
      panCurrentXY.current = { x: nx, y: ny };
      panOffset.setValue({ x: nx, y: ny });
    })
    .onEnd((e) => {
      Animated.decay(panOffset, {
        velocity: { x: e.velocityX / 1000, y: e.velocityY / 1000 },
        deceleration: 0.997,
        useNativeDriver: false,
      }).start();
    }),
  [maxTranslateX, maxTranslateY]
);
```

Add a listener so `panCurrentXY` stays in sync during decay (place near other useEffects):

```typescript
useEffect(() => {
  const id = panOffset.addListener(({ x, y }) => {
    const cx = Math.max(maxTranslateX, Math.min(0, x));
    const cy = Math.max(maxTranslateY, Math.min(0, y));
    panCurrentXY.current = { x: cx, y: cy };
    setScrollY(-cy);   // drives now-indicator visibility
    setScrollX(-cx);   // drives now-indicator left/right check
  });
  return () => panOffset.removeListener(id);
}, [maxTranslateX, maxTranslateY]);
```

---

## Step 4 — Compose pinch + pan into one gesture

```typescript
const composedGesture = useMemo(
  () => Gesture.Race(pinchZoomGesture, panGesture),
  [pinchZoomGesture, panGesture]
);
```

`Race` means the first gesture to activate wins — pinch (2 fingers) beats pan
(1 finger) because `panGesture` has `maxPointers(1)`.

Remove `setNativeProps` calls from `pinchZoomGesture.onStart` and `.onFinalize`
— they were for disabling the old ScrollViews, which no longer exist on the
narrow path.

---

## Step 5 — Update scrollToNow

Replace `ScrollView.scrollTo` calls with Animated:

```typescript
const scrollToNow = (animated = true) => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowOffset = ((nowMinutes - START_HOUR * 60) / 60) * hourHeight;

  const targetNX = isNarrow
    ? Math.max(maxTranslateX, Math.min(0,
        -(now.getDay() * (MOBILE_DAY_WIDTH + DAY_GAP) - Spacing.sm)))
    : 0;
  const targetNY = Math.max(maxTranslateY, Math.min(0, -(Math.max(nowOffset - hourHeight, 0))));

  panCurrentXY.current = { x: targetNX, y: targetNY };

  if (animated) {
    Animated.spring(panOffset, {
      toValue: { x: targetNX, y: targetNY },
      useNativeDriver: false,
      bounciness: 0,
      speed: 14,
    }).start();
  } else {
    panOffset.setValue({ x: targetNX, y: targetNY });
  }
};
```

---

## Step 6 — Update now-indicator offscreen detection

Replace the `scrollX` / `horizontalViewportWidth` references with `viewportWidth`.
`scrollX` and `scrollY` are now updated by the panOffset listener in Step 3.
All the `nowOffscreen*` boolean derivations remain the same logic, just with
`viewportWidth` instead of `horizontalViewportWidth`.

---

## Step 7 — Replace the narrow JSX

The old narrow JSX is two nested ScrollViews. Replace the entire `{isNarrow ? (...) : (...)}` narrow branch with:

```tsx
<View
  style={{ flex: 1, overflow: 'hidden' }}
  onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
>
  {/* Day headers — translate X only (sticky vertically) */}
  <Animated.View
    style={{
      flexDirection: 'row',
      width: MOBILE_CALENDAR_WIDTH,
      transform: [{ translateX: panOffset.x }],
    }}
  >
    <View style={styles.dayHeaderRow}>
      {days.map((day) => (
        <DayHeader key={day.date} dayIndex={day.dayIndex} date={day.date} isToday={day.isToday} isNarrow />
      ))}
    </View>
  </Animated.View>

  {/* All-day row — translate X only */}
  {hasTopItems && (
    <Animated.View
      style={{
        flexDirection: 'row',
        width: MOBILE_CALENDAR_WIDTH,
        transform: [{ translateX: panOffset.x }],
      }}
    >
      <View style={styles.dayHeaderRow}>
        {days.map((day) => (
          <AllDayCell
            key={day.date}
            events={day.allDayEvents}
            untimedSlots={day.untimedSlots}
            onEventPress={setSelectedEvent}
            onAssignRecipe={handleAssignRecipe}
            onDeleteSlot={handleDeleteSlot}
          />
        ))}
      </View>
    </Animated.View>
  )}

  {/* Scrollable grid — translate X and Y */}
  <GestureDetector gesture={composedGesture}>
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
    >
      <Animated.View
        style={{
          width: MOBILE_CALENDAR_WIDTH,
          transform: [{ translateX: panOffset.x }, { translateY: panOffset.y }],
        }}
      >
        {/* Pinch preview wrapper */}
        <Animated.View
          style={[{ height: gridHeight, width: MOBILE_CALENDAR_WIDTH, flexDirection: 'row', gap: DAY_GAP }, pinchPreviewTransform]}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <DayColumn
              key={i}
              bgColor={theme.backgroundElement}
              borderColor={theme.border}
              textColor={theme.textSecondary}
              hourHeight={hourHeight}
            />
          ))}
          <WeekEventsOverlay
            days={days}
            isCurrentWeek={isCurrentWeek}
            hourHeight={hourHeight}
            gridHeight={gridHeight}
            onAddSlot={handleAddSlot}
            onAssignRecipe={handleAssignRecipe}
            onDeleteSlot={handleDeleteSlot}
            onEventPress={setSelectedEvent}
          />
        </Animated.View>
      </Animated.View>
    </View>
  </GestureDetector>
</View>
```

---

## Step 8 — Remove the outer GestureDetector for pinchZoomGesture

The outer `<GestureDetector gesture={pinchZoomGesture}>` wrapping the whole
`calendarShell` can be removed — the composed gesture is now on the inner
`GestureDetector` around the grid only.

---

## Step 9 — Reset panOffset on week change

When the user changes weeks the pan position should reset to 0,0 (or scroll-to-now):

```typescript
useEffect(() => {
  panOffset.stopAnimation();
  panOffset.setValue({ x: 0, y: 0 });
  panCurrentXY.current = { x: 0, y: 0 };
  const timer = setTimeout(() => {
    if (weekOffset === 0) scrollToNow(false);
  }, 150);
  return () => clearTimeout(timer);
}, [weekOffset]);
```

This replaces the existing `scrollToNow` useEffect.

---

## Known edge cases
- **Tap target accuracy**: `DayEventsColumn` computes tap time from
  `e.nativeEvent.locationY`. This is relative to the column view, not the
  viewport, so it remains correct after the pan transform. No change needed.
- **Pinch during pan**: `Gesture.Race` means once pan activates (1 finger),
  a second finger that starts a pinch will cause the pan to cancel and pinch
  to take over. This is the desired behavior.
- **Web path**: completely unchanged — wide path keeps its vertical ScrollView.
- **Scroll-to-now button**: `showScrollToNow` logic is unchanged; `scrollY` and
  `scrollX` are kept in sync by the panOffset listener.
