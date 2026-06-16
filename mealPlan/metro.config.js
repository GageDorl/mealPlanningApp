const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @powersync/web uses WASM files — Metro must treat them as binary assets,
// not as JavaScript source. Move wasm from sourceExts to assetExts.
config.resolver.assetExts = [...(config.resolver.assetExts ?? []), 'wasm'];
config.resolver.sourceExts = (config.resolver.sourceExts ?? []).filter(
  (ext) => ext !== 'wasm',
);

// @supabase/supabase-js ESM build contains `import(OTEL_PKG)` — a dynamic import
// with a variable that Hermes rejects at compile time. The CJS build uses require()
// instead, which Hermes handles fine. Force Metro to resolve to the CJS entrypoint.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@supabase/supabase-js') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/@supabase/supabase-js/dist/index.cjs'),
    };
  }
  // @powersync/react-native requires 'react-native' at module load time, which crashes in
  // the web SSR (transform.environment=node) context. On web, redirect it to a shim that
  // re-exports the same API surface from @powersync/react + @powersync/web (no react-native).
  if (platform === 'web' && moduleName === '@powersync/react-native') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/services/powersync-web-shim.ts'),
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
