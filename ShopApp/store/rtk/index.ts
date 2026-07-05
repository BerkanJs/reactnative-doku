// Gün 37 — Redux Toolkit: store kurulumu (bkz. store/rtk/urunSlice.ts başındaki not)
// Bu store hiçbir yerde <Provider> ile sağlanmıyor — ShopApp Zustand kullanıyor.
// Karşılaştırma/öğrenme amaçlı, bağımsız çalışan bir örnek.

import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import urunReducer from './urunSlice';
import sepetReducer from './sepetSlice';

export const rtkStore = configureStore({
  reducer: {
    urun: urunReducer,
    sepet: sepetReducer,
  },
});

export type RootState = ReturnType<typeof rtkStore.getState>;
export type AppDispatch = typeof rtkStore.dispatch;

// Typed hook'lar — useSelector/useDispatch'ı her yerde <RootState> ile yazmak yerine
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
