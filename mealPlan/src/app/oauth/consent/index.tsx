import { StyleSheet, Text, View } from 'react-native';
import { Spacing } from '@/constants/theme';

export default function ConsentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Please check your email to confirm your subscription.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});