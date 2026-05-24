/** Montants stockés en XOF ; l’API fournisseur attend XAF (parité 1:1). */
export function toProviderCurrency(storedDevise: string): string {
  if (storedDevise === 'XOF') {
    return 'XAF';
  }
  return storedDevise;
}

export function toProviderAmount(storedAmount: number): number {
  return storedAmount;
}
