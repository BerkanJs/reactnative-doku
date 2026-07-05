// Gün 6 — Tab Navigator: alt tab bar
// Gün 27 — Tema renkleri
// Gün 38 — A11y: tab butonları için accessibilityLabel
// Gün 33 — Sepet adet rozeti (offline da çalışır)

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useTema } from '@/hooks/useTema';
import { useSepetStore } from '@/store/sepetStore';

function SepetIkonu({ renk, boyut }: { renk: string; boyut: number }) {
  const adet = useSepetStore((state) => state.toplamAdet());

  return (
    <View>
      <Ionicons name="cart-outline" size={boyut} color={renk} />
      {adet > 0 && (
        <View
          style={styles.rozet}
          accessible
          accessibilityLabel={`${adet} ürün sepette`}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.rozetYazi}>
            {adet > 99 ? '99+' : String(adet)}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { tema } = useTema();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: tema.colors.tab,
          borderTopColor: tema.colors.sinir,
        },
        tabBarActiveTintColor: tema.colors.birincil,
        tabBarInactiveTintColor: tema.colors.yaziIkincil,
        headerStyle: { backgroundColor: tema.colors.header },
        headerTintColor: tema.colors.yaziBaslik,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.anasayfa'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: t('nav.anasayfa'),
        }}
      />
      <Tabs.Screen
        name="sepet"
        options={{
          title: t('nav.sepet'),
          tabBarIcon: ({ color, size }) => (
            <SepetIkonu renk={color} boyut={size} />
          ),
          tabBarAccessibilityLabel: t('nav.sepet'),
        }}
      />
      <Tabs.Screen
        name="siparisler"
        options={{
          title: t('nav.siparisler'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: t('nav.siparisler'),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: t('nav.profil'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: t('nav.profil'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  rozet: {
    position: 'absolute',
    top: -4,
    end: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  rozetYazi: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
