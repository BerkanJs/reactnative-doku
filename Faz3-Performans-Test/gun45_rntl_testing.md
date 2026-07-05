# Gün 45 — React Native Testing Library

> Test yazmak "uygulama çalışıyor mu?" sorusunun değil, "uygulama doğru çalışıyor mu?" sorusunun cevabıdır. Bu ikisi farklı sorulardır. Bugün React Native'de bileşen testleri nasıl yazılır, web'deki Testing Library ile farkları nelerdir, ve en sık takılınan konu olan native modül mock'lama nasıl yapılır.

---

## Test Neden Gerekli? — Doğru Motivasyonu Kuralım

"Manuel test etmiyorum muyum zaten?" sorusu akla gelir. Manuel test gerçek kullanıcı deneyimini yakalar ama iki problemi vardır:

**1. Kapsam problemi:** Her değişiklikte uygulamanın tüm ekranlarını elle gezip test etmek mümkün değil. Bir düzenleme başka bir ekranı bozabilir ve sen fark etmezsin.

**2. Güven problemi:** Büyük bir refactor yapmak istiyorsun — state yönetimini Zustand'dan RTK'ya geçirmek gibi. Manuel testle bu güvenli hissetmez. Otomatik testler "davranış değişmedi" garantisi verir.

Test, kodu değil **davranışı** kilitler. Implementation değişebilir, davranış aynı kalmalı.

---

## Testing Library Felsefesi — Neden Farklı Bir Yaklaşım?

Test kütüphaneleri tarihsel olarak iki şekilde çalışmıştır:

**Eski yol (Enzyme gibi):** Component'in internal state'ini, method'larını, lifecycle'ını test et. `wrapper.state('count')` veya `wrapper.instance().handlePress()` gibi. Sorun: implementation detaylarını test ediyorsun. `useState` yerine `useReducer` kullanmaya geçersen testler bozulur — kullanıcı hiçbir şey fark etmese bile.

**Testing Library'nin yolu:** Kullanıcı neyi görür, neye dokunur, ne okur — bunları test et. Internal state'e hiç bakma. Ekranda "Sepete Ekle" butonu var mı? Butona basılınca "Sepetinizde 1 ürün var" mı yazıyor? Bunları test et. Implementation ne olursa olsun bu davranış doğruysa test geçer.

Bu felsefe web'de `@testing-library/react` ile başladı, React Native'e `@testing-library/react-native` olarak taşındı.

---

## Kurulum

```bash
npx expo install @testing-library/react-native @testing-library/jest-native
```

`package.json`'da jest konfigürasyonu:

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"]
  }
}
```

`setupFilesAfterFramework` ile `@testing-library/jest-native/extend-expect` eklenmesinin sebebi: `toBeVisible()`, `toHaveTextContent()` gibi custom matcher'ları Jest'e tanıtmak. Bu satır olmadan bu matcher'lar "bilinmiyor" hatası verir.

---

## render ve screen — Temel Yapı

```tsx
import { render, screen } from '@testing-library/react-native';
import { UrunKart } from '@/components/UrunKart';

test('ürün başlığını ve fiyatını gösterir', () => {
  render(
    <UrunKart
      urun={{ id: '1', baslik: 'Wireless Kulaklık', fiyat: 299, gorsel_url: '', gorsel_blur: '' }}
      onPress={jest.fn()}
    />
  );

  expect(screen.getByText('Wireless Kulaklık')).toBeVisible();
  expect(screen.getByText('299 ₺')).toBeVisible();
});
```

`render` component'i sanal bir ortamda (gerçek telefon değil, Node.js içinde çalışan simülasyon) oluşturur. Ekrana değil, belleğe render eder.

`screen` bu render edilmiş çıktıyı sorgulamak için kullanılan nesne. `screen.getByText('...')` ekranda o metni içeren ilk element'i döner; bulamazsa test hemen hata verir — bu `toBeTruthy()` kontrolünden daha güvenlidir çünkü element yoksa test zaten çöker, sessizce geçmez.

---

## Query'ler — Ekranda Neyi Nasıl Ararsın?

Testing Library birkaç farklı query stratejisi sunar. Hangisini ne zaman kullanacağını bilmek önemlidir.

### getBy vs queryBy vs findBy — Ne Fark Var?

**`getBy`:** Element'i hemen arar. Bulamazsa test anında hata verir. Element kesinlikle orada olmalıysa kullan.

```tsx
screen.getByText('Sepete Ekle');
// 'Sepete Ekle' yoksa: ❌ "Unable to find element with text: Sepete Ekle"
```

**`queryBy`:** Element'i arar. Bulamazsa `null` döner, hata vermez. "Bu element ekranda OLMAMALI" testleri için kullan.

```tsx
expect(screen.queryByText('Hata oluştu')).toBeNull();
// 'Hata oluştu' metni yoksa: ✅
```

**`findBy`:** Element'i arar ama async — bir süre bekler. Ağ isteği sonrası, `useEffect` sonrası gibi gecikmeyle gelen elementler için kullan. Promise döner, `await` gerekir.

```tsx
const baslik = await screen.findByText('Wireless Kulaklık');
// Birkaç ms bekler, element belirirse ✅
```

### Hangi Query'yi Kullanmak Daha İyi?

Testing Library öncelik sırası önerir — kullanıcı perspektifinden en anlamlı olandan başla:

1. `getByRole` — kullanıcı bu elementi ne olarak görür? Buton mu, başlık mı, link mi?
2. `getByLabelText` — form alanları için, accessibility label'ı
3. `getByPlaceholderText` — input placeholder'ı
4. `getByText` — ekrandaki metin
5. `getByTestId` — son çare; diğerleri olmadığında

```tsx
// Kötü: testId her şeye yapat
<Pressable testID="sepet-butonu">

// İyi: role kullan — ekran okuyucu da aynı şeyi kullanır
screen.getByRole('button', { name: 'Sepete Ekle' });
// 'name' → accessibilityLabel değeridir
```

`getByRole` kullanmak aynı zamanda accessibility'i zorlar. Eğer `accessibilityRole` ve `accessibilityLabel` yazmadıysan bu query çalışmaz — test, eksik accessibility'i ortaya çıkarır.

---

## fireEvent — Kullanıcı Etkileşimi Simüle Et

```tsx
import { fireEvent } from '@testing-library/react-native';

test('sepete ekle butonuna basınca callback çağrılır', () => {
  const onSepeteEkle = jest.fn();

  render(<UrunKart urun={mockUrun} onSepeteEkle={onSepeteEkle} />);

  fireEvent.press(screen.getByRole('button', { name: 'Sepete Ekle' }));

  expect(onSepeteEkle).toHaveBeenCalledWith('1'); // urun.id ile çağrıldı mı?
  expect(onSepeteEkle).toHaveBeenCalledTimes(1);  // tam bir kez mi?
});
```

`fireEvent.press` butonun `onPress` handler'ını tetikler. Web'deki `fireEvent.click` değil — React Native'de tıklama değil dokunma var.

Yaygın `fireEvent` metodları:

| Metod | Ne Tetikler |
|-------|-------------|
| `fireEvent.press(element)` | `onPress` |
| `fireEvent.changeText(input, 'değer')` | `onChangeText` |
| `fireEvent.scroll(list, eventData)` | `onScroll` |
| `fireEvent(element, 'longPress')` | `onLongPress` |

---

## act() — State Güncellemelerini Wrap Et

Bu konu en çok kafa karıştıran konulardan biridir. Önce sorunu görelim.

React bileşenleri state güncellenince re-render olur. Test ortamında bu re-render senkron değil — React kuyruğa alır. Eğer bir kullanıcı etkileşiminden sonra hemen ekranı sorgularsan, state henüz güncellenmemiş olabilir.

```tsx
test('butona basınca sayaç artar', () => {
  render(<Sayac />);
  fireEvent.press(screen.getByText('Artır'));

  // ❌ Potansiyel sorun: state güncellemesi henüz bitmemiş olabilir
  expect(screen.getByText('1')).toBeVisible();
});
```

`act()` React'a "bu blok içindeki her şeyi çalıştır ve tüm state güncellemelerini, side effect'leri bitir" der.

```tsx
import { act } from '@testing-library/react-native';

test('butona basınca sayaç artar', () => {
  render(<Sayac />);

  act(() => {
    fireEvent.press(screen.getByText('Artır'));
  });

  expect(screen.getByText('1')).toBeVisible();
});
```

**İyi haber:** `@testing-library/react-native`'nin `fireEvent` metotları zaten `act()` içinde çalışır. Yani çoğu zaman `act()` yazmana gerek kalmaz. `act()` manuel olarak gerektiği durumlar: `useEffect` içinde state güncelleyen asenkron işlemler, timer'lar (`jest.runAllTimers()`), veya testing library'nin kapsamamadığı özel durumlar.

---

## waitFor — Async İşlemleri Test Et

API çağrısı yapan, `useEffect` içinde veri yükleyen component'leri test ederken element anında ekranda olmaz. `waitFor` belirtilen süre boyunca tekrar tekrar kontrol eder.

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';

// API'den ürün listesi yükleyen component
test('ürünler yüklendikten sonra listede görünür', async () => {
  // API çağrısını mock'la (aşağıda detaylı anlatılacak)
  jest.mocked(fetchUrunler).mockResolvedValue([
    { id: '1', baslik: 'Kulaklık', fiyat: 299 }
  ]);

  render(<UrunListesi />);

  // Önce loading göstergesi var mı?
  expect(screen.getByRole('progressbar')).toBeVisible();

  // Ürün listesi gelene kadar bekle
  await waitFor(() => {
    expect(screen.getByText('Kulaklık')).toBeVisible();
  });

  // Loading artık yok
  expect(screen.queryByRole('progressbar')).toBeNull();
});
```

`waitFor` varsayılan olarak 1000ms boyunca her 50ms'de bir callback'i çalıştırır. Element bulunursa devam eder, 1000ms sonunda hâlâ bulunamazsa test hata verir.

---

## Mock — Native Modülleri Nasıl Simüle Edersin?

Bu konu React Native testinin web testinden en büyük farkıdır.

Web'de test ortamında (jsdom) `localStorage`, `fetch`, `window` gibi API'lar çalışır. Ama React Native'de `expo-camera`, `expo-location`, `AsyncStorage` gibi modüller **gerçek native kodu** çağırır. Test ortamı Node.js'tir — Node.js'te ne kamera var ne GPS. Bu modüller doğrudan çalıştırılmaya kalkılsa hata verir.

Çözüm: bu modülleri **mock** ile değiştir. Mock, gerçek modülün yerine geçen sahte bir versiyondur. Aynı API'yi sunar ama gerçek native işlem yapmaz — sadece istediğin değeri döner.

### jest.mock ile Inline Mock

```tsx
// Test dosyasının en üstünde
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
```

Bu satır Jest'e "bu modülü import edilmeye çalışıldığında gerçek kodunu değil, bu nesneyi ver" der. `jest.fn()` çağrıldığında hiçbir şey yapmaz, sadece "çağrıldım" bilgisini kaydeder — sonra `toHaveBeenCalled()` ile kontrol edebilirsin.

### Mock Değer Döndürmek

```tsx
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(JSON.stringify({ token: 'abc123' })),
  // mockResolvedValue: Promise.resolve(değer) döner — async fonksiyon gibi davranır
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
}));
```

`mockResolvedValue` Promise dönen (async) fonksiyonların mock'ı için kullanılır. `AsyncStorage.getItem()` gerçekte de Promise döner, mock da aynı şekilde Promise dönmeli — aksi hâlde component mock'u gerçekmiş gibi kullanırken davranış bozulur.

### __mocks__ Klasörü — Merkezi Mock Yönetimi

Her test dosyasına aynı `jest.mock(...)` satırlarını yazmak tekrar ve hata kaynağıdır. Çözüm: `__mocks__` klasörü.

```
src/
├── __mocks__/
│   └── @react-native-async-storage/
│       └── async-storage.ts   ← bu dosya otomatik kullanılır
├── components/
└── screens/
```

```ts
// __mocks__/@react-native-async-storage/async-storage.ts
const mockStorage: Record<string, string> = {};

export default {
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    return Promise.resolve();
  }),
};
```

Bu dosya oluşturulunca `jest.mock('@react-native-async-storage/async-storage')` yazmana gerek kalmaz. Jest bu modülü import eden her dosyada otomatik olarak `__mocks__` versiyonunu kullanır.

### Expo Router'ı Mock'lama

Test ortamında navigation yoktur — `useRouter()` çağrısı hata verir. Mock:

```tsx
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'test-id' }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
```

---

## Tam Bir Test Örneği: Sepet Bileşeni

```tsx
// __tests__/SepetEkrani.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SepetEkrani } from '@/screens/SepetEkrani';
import { useCartStore } from '@/store/cartStore';

// Zustand store'u resetle — testler birbirini etkilemesin
beforeEach(() => {
  useCartStore.setState({ urunler: [], toplam: 0 });
});

test('boş sepette "Sepetiniz boş" mesajı görünür', () => {
  render(<SepetEkrani />);
  expect(screen.getByText('Sepetiniz boş')).toBeVisible();
});

test('sepette ürün varsa listelenir', () => {
  // Store'a doğrudan veri yaz — UI üzerinden test etmek zorunda değilsin
  useCartStore.setState({
    urunler: [{ id: '1', baslik: 'Kulaklık', fiyat: 299, adet: 2 }],
    toplam: 598,
  });

  render(<SepetEkrani />);

  expect(screen.getByText('Kulaklık')).toBeVisible();
  expect(screen.getByText('598 ₺')).toBeVisible();
});

test('ürün silinince listeden kalkar', async () => {
  useCartStore.setState({
    urunler: [{ id: '1', baslik: 'Kulaklık', fiyat: 299, adet: 1 }],
    toplam: 299,
  });

  render(<SepetEkrani />);

  fireEvent.press(screen.getByRole('button', { name: 'Kulaklık ürününü sil' }));

  await waitFor(() => {
    expect(screen.queryByText('Kulaklık')).toBeNull();
    expect(screen.getByText('Sepetiniz boş')).toBeVisible();
  });
});
```

---

## Web Testing Library ile Farklar — Özet Tablo

| Konu | Web (RTL) | React Native (RNTL) | Neden Farklı |
|------|-----------|---------------------|--------------|
| Tıklama | `fireEvent.click` | `fireEvent.press` | Touch event, mouse event değil |
| Metin girişi | `fireEvent.change(input, { target: { value: 'abc' } })` | `fireEvent.changeText(input, 'abc')` | RN'de event objesi yok |
| Render ortamı | jsdom (DOM simülasyonu) | react-native test renderer | Native view hiyerarşisi |
| Native modüller | Çoğu çalışır | Mock gerekir | Node.js'te native API yok |
| Async wait | `waitFor` | `waitFor` — aynı | Aynı |
| Role'ler | HTML ARIA role'leri | `accessibilityRole` değerleri | Farklı isimler |

---

## Kontrol Soruları

1. `getByText` yerine `getByRole` kullanmak neden daha iyi? Somut bir durumda ikisi arasında ne fark eder?
2. `getBy`, `queryBy`, `findBy` farkı nedir? "Bu element bu ekranda OLMAMALI" testi için hangisini kullanırsın?
3. `fireEvent` zaten `act()` içinde çalışıyor dedik. O zaman `act()` ne zaman manuel olarak yazmak gerekir?
4. `__mocks__` klasörü neden her test dosyasına `jest.mock()` yazmaktan daha iyi?
5. Zustand store'u test içinde `setState` ile doğrudan doldurmak mı daha iyi, yoksa UI üzerinden senaryo mu kurmalısın? Hangisini ne zaman kullanırsın?

---

## Sonraki Gün

**Gün 46 — Hafta 7 Özeti:** Performans optimizasyonu konularının özeti ve mini proje — ShopApp ürün listesinin tüm optimizasyonları uygulanmış, test yazılmış versiyonu.
