// Gün 45 — Global test setup: native modüllerin Node.js ortamında çökmemesi için mock'lar

import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// expo-localization Node.js test ortamında native köprüye erişemez — sabit bir locale döndür
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'tr', languageTag: 'tr-TR', textDirection: 'ltr' }],
}));

// @sentry/react-native: testlerde gerçek ağ isteği/timer kurulmasın
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  ErrorBoundary: ({ children }) => children,
}));

// @react-native-firebase/*: native modül gerektirir, Node.js testinde yok — mock'la
jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({
    logScreenView: jest.fn(),
    logAddToCart: jest.fn(),
    logSearch: jest.fn(),
  }),
}));
jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: () => ({
    setUserId: jest.fn(),
    setAttribute: jest.fn(),
    recordError: jest.fn(),
  }),
}));
jest.mock('@react-native-firebase/remote-config', () => ({
  __esModule: true,
  default: () => ({
    setDefaults: jest.fn(),
    setConfigSettings: jest.fn(),
    fetchAndActivate: jest.fn(),
    getValue: () => ({ asNumber: () => 10, asBoolean: () => false }),
  }),
}));

// expo-router: navigation gerçek ortamda çalışmaz — testlerde no-op mock yeterli
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }) => children,
}));
