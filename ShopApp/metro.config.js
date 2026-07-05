// Gün 36 — NativeWind metro entegrasyonu
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// zustand'ın ESM derlemesi (esm/middleware.mjs), Metro'nun web'de "import"
// koşulunu tercih etmesi yüzünden seçiliyor ve içinde ham `import.meta.env`
// barındırıyor. Metro web bundle'ı normal bir <script> (module olmayan)
// olarak sunduğundan bu satır parse hatası veriyor ve tüm bundle çalışmıyor
// (anasayfa boş kalıyor). CJS derlemesini zorlayarak çözüyoruz.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand/middleware') {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'node_modules/zustand/middleware.js'),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
