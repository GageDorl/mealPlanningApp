import { Component, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class BetaErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[BetaErrorBoundary] Caught render error:', error.message);
    console.error('[BetaErrorBoundary] Component stack:', info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.badge}>BETA — UNHANDLED ERROR</Text>
          <Text style={styles.name}>{error.name}</Text>
          <Text style={styles.message}>{error.message}</Text>
          {error.stack ? (
            <ScrollView style={styles.stackScroll}>
              <Text style={styles.stack}>{error.stack}</Text>
            </ScrollView>
          ) : null}
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Dismiss &amp; retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#2d0000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
    padding: 20,
    width: '100%',
    maxWidth: 480,
    gap: 10,
  },
  badge: {
    color: '#ff4444',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  name: {
    color: '#ff8888',
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    color: '#ffcccc',
    fontSize: 14,
    lineHeight: 20,
  },
  stackScroll: {
    maxHeight: 220,
    backgroundColor: '#1a0000',
    borderRadius: 8,
    padding: 8,
  },
  stack: {
    color: '#ff9999',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 15,
  },
  button: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
