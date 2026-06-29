import { useState } from 'react';
import { View, type ViewStyle } from 'react-native';

interface Props {
  active: boolean;
  tooltip: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function TooltipAnchor({ active, tooltip, children, style }: Props) {
  const [anchorHeight, setAnchorHeight] = useState(0);
  return (
    <View style={[style, { zIndex: active ? 20 : 1 }]}>
      <View onLayout={(e) => setAnchorHeight(e.nativeEvent.layout.height)}>
        {children}
      </View>
      {active && anchorHeight > 0 && (
        <View
          style={{
            position: 'absolute',
            top: anchorHeight,
            left: 0,
            right: 0,
            zIndex: 100,
          }}
        >
          {tooltip}
        </View>
      )}
    </View>
  );
}
