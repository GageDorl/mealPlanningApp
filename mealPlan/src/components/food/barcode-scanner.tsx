import { useState, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { usePowerSync } from '@powersync/react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lookupBarcode } from '@/services/fatsecret';
import type { FoodDetails } from '@/services/fatsecret';
import { isOnline, OFFLINE_MESSAGE } from '@/utils/offline-gate';

interface BarcodeScannerProps {
  onFoodFound: (details: FoodDetails, barcode: string) => void;
  onNotFound: () => void;
  onDismiss: () => void;
}

export function BarcodeScanner({ onFoodFound, onNotFound, onDismiss }: BarcodeScannerProps) {
  const theme = useTheme();
  const db = usePowerSync();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const scannedRef = useRef(false);

  const handleBarcode = useCallback(async ({ data }: { data: string }) => {
    if (scannedRef.current || loading) return;
    scannedRef.current = true;
    setLoading(true);
    setNotFoundMessage(null);
    try {
      const normalizedBarcode = data.padStart(13, '0');
      const details = await lookupBarcode(normalizedBarcode, db);
      if (details) {
        onFoodFound(details, normalizedBarcode);
      } else {
        setNotFoundMessage(
          isOnline()
            ? 'Product not found. You can add it manually to your personal food library.'
            : OFFLINE_MESSAGE,
        );
        scannedRef.current = false;
      }
    } catch {
      setNotFoundMessage(
        isOnline()
          ? 'Product not found. You can add it manually to your personal food library.'
          : OFFLINE_MESSAGE,
      );
      scannedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [loading, onFoodFound]);

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.permissionText, { color: theme.text }]}>
          Camera access is required to scan barcodes.
        </Text>
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable style={styles.dismissLink} onPress={onDismiss}>
          <Text style={[styles.dismissLinkText, { color: theme.textSecondary }]}>Enter manually instead</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
        onBarcodeScanned={loading || notFoundMessage ? undefined : handleBarcode}
      />

      {/* Dimmed overlay with cut-out */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          {loading ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.statusText}>Looking up food…</Text>
            </View>
          ) : notFoundMessage ? (
            <View style={styles.notFoundBox}>
              <Text style={styles.notFoundText}>{notFoundMessage}</Text>
              <Pressable style={styles.retryBtn} onPress={() => setNotFoundMessage(null)}>
                <Text style={styles.retryBtnText}>Scan again</Text>
              </Pressable>
              <Pressable onPress={onNotFound}>
                <Text style={styles.manualLink}>Enter manually instead</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.instructionText}>Point at a barcode to scan</Text>
          )}
          <Pressable style={styles.cancelBtn} onPress={onDismiss}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.55)';
const CORNER_SIZE = 22;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  } as ViewStyle,
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  } as ViewStyle,
  permissionText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,
  permissionBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  } as ViewStyle,
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FontSizes.md,
  } as TextStyle,
  dismissLink: {
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  dismissLinkText: {
    fontSize: FontSizes.sm,
    textDecorationLine: 'underline',
  } as TextStyle,
  overlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'column',
  } as ViewStyle,
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  } as ViewStyle,
  overlayMiddle: {
    flexDirection: 'row',
    height: 220,
  } as ViewStyle,
  overlaySide: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  } as ViewStyle,
  scanWindow: {
    width: 260,
    height: 220,
  } as ViewStyle,
  overlayBottom: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  } as ViewStyle,
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFFFFF',
  } as ViewStyle,
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  } as ViewStyle,
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  } as ViewStyle,
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  } as ViewStyle,
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  } as ViewStyle,
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  statusText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '500',
  } as TextStyle,
  notFoundBox: {
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  notFoundText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    textAlign: 'center',
  } as TextStyle,
  retryBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  } as ViewStyle,
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FontSizes.sm,
  } as TextStyle,
  manualLink: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSizes.sm,
    textDecorationLine: 'underline',
  } as TextStyle,
  instructionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  cancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  } as ViewStyle,
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: FontSizes.md,
  } as TextStyle,
});
