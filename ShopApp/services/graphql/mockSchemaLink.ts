// Gün 40 — GraphQL: gerçek sunucu olmadan çalışan Apollo Link
// İstek geldiğinde şemayı yerelde (JS thread üzerinde) çalıştırır — network yok.
// Prodüksiyonda gerçek sunucu bağlanınca bu link'in yerini httpLink alır.

import { ApolloLink, Observable, type FetchResult } from '@apollo/client';
import { execute as graphqlExecute } from 'graphql';
import { semaGraf, kokDegeri } from './schema';

export const mockSchemaLink = new ApolloLink((operation) => {
  return new Observable<FetchResult>((observer) => {
    Promise.resolve(
      graphqlExecute({
        schema: semaGraf,
        document: operation.query,
        rootValue: kokDegeri,
        variableValues: operation.variables,
        operationName: operation.operationName,
      })
    )
      .then((sonuc) => {
        observer.next(sonuc as FetchResult);
        observer.complete();
      })
      .catch((hata) => observer.error(hata));
  });
});
