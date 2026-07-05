// Gün 36 — NativeWind: className tabanlı stil, dark: varyantı useTema ile senkron
// (bkz. app/_layout.tsx — nativewindColorScheme.set)

import { View, Text } from 'react-native';

interface Props {
  kalanAdet: number;
}

export function DusukStokRozeti({ kalanAdet }: Props) {
  if (kalanAdet <= 0 || kalanAdet > 5) return null;

  return (
    <View
      className="absolute bottom-2 start-2 rounded-full bg-orange-100 px-2 py-1 dark:bg-orange-900/40"
      accessible={false}
    >
      <Text className="text-xs font-bold text-orange-600 dark:text-orange-300">
        Son {kalanAdet} adet!
      </Text>
    </View>
  );
}
