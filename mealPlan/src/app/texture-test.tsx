import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WoodTexture } from '@/components/WoodTexture';

export default function TextureTestScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.heading}>Texture Test</Text>
      <Text style={styles.subheading}>Platform: {Platform.OS}</Text>

      <Text style={styles.label}>Texture (matches system theme)</Text>
      <View style={styles.preview}>
        <WoodTexture width={360} height={220} style={styles.rounded}>
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Full opacity</Text>
          </View>
        </WoodTexture>
      </View>

      <Text style={styles.label}>Texture — subtle (60% opacity)</Text>
      <View style={styles.preview}>
        <WoodTexture width={360} height={220} style={{ borderRadius: 20, opacity: 0.6 }}>
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Subtle</Text>
          </View>
        </WoodTexture>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    gap: 12,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    alignSelf: 'flex-start',
  },
  subheading: {
    color: 'white',
    opacity: 0.6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  preview: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  rounded: {
    borderRadius: 20,
  },
  overlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
    minHeight: 220,
  },
  overlayText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
