import { useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '@/constants/theme';

type Props = {
  deger: string;
  onChange: (metin: string) => void;
  placeholder?: string;
};

export function SearchBar({ deger, onChange, placeholder = 'Ürün ara...' }: Props) {
  const inputRef = useRef<TextInput>(null);

  const temizle = () => {
    onChange('');
    inputRef.current?.focus();
    // Temizle + klavyeyi açık tut
  };

  return (
    <View style={styles.kapsayici}>
      <View style={styles.inputAlani}>
        <Ionicons
          name="search-outline"
          size={18}
          color={COLORS.textDisabled}
          style={styles.aramaIkonu}
        />

        <TextInput
          ref={inputRef}
          value={deger}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textDisabled}
          style={styles.input}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          // clearButtonMode: iOS'ta otomatik X butonu — 'never' çünkü kendimizkontrol ediyoruz
        />

        {deger.length > 0 && (
          <Pressable onPress={temizle} style={styles.temizleButon} hitSlop={8}>
            {/* hitSlop: parmak büyük — dokunma alanını 8px genişlet */}
            <Ionicons name="close-circle" size={18} color={COLORS.textDisabled} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  inputAlani: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 44,
    // 44dp minimum dokunma hedefi — Apple HIG standardı
  },
  aramaIkonu: {
    marginEnd: SPACING.sm, // Gün 39 — RTL'de otomatik marginLeft'e döner
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    height: '100%',
    // height: '100%' — özellikle Android'de input alanını kapla
  },
  temizleButon: {
    marginStart: SPACING.sm, // Gün 39 — RTL'de otomatik marginRight'e döner
  },
});
