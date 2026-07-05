// Gün 40 — Apollo Client kurulumu
// Auth link + HTTP link birleştirmesi
// InMemoryCache: ürün ID'sine göre normalize

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import * as SecureStore from 'expo-secure-store';
import { mockSchemaLink } from './graphql/mockSchemaLink';

// Gerçek GraphQL sunucusu yok — urunServisi.ts'teki KULLAN_MOCK yaklaşımıyla tutarlı
const KULLAN_MOCK = true;

const httpLink = createHttpLink({
  uri: 'https://api.shopapp.example.com/graphql',
});

const authLink = setContext(async (_, { headers }) => {
  const token = await SecureStore.getItemAsync('access_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: KULLAN_MOCK ? mockSchemaLink : authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Urun: {
        keyFields: ['id'],   // ürünler ID ile normalize edilir
      },
      Siparis: {
        keyFields: ['id'],
      },
      YorumlarSonucu: {
        keyFields: ['urunId'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
    },
  },
});
