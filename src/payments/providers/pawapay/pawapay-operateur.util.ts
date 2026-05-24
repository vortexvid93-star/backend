/** Séparateur : provider PawaPay + depositId UUID dans `paiement.operateur`. */
export const PAWAPAY_OPERATEUR_SEP = '#';

export function encodePawaPayOperateur(
  provider: string,
  depositId: string,
): string {
  return `${provider}${PAWAPAY_OPERATEUR_SEP}${depositId}`;
}

export function decodePawaPayOperateur(stored: string | null | undefined): {
  provider: string;
  depositId: string;
} | null {
  if (!stored?.includes(PAWAPAY_OPERATEUR_SEP)) {
    return null;
  }
  const [provider, depositId] = stored.split(PAWAPAY_OPERATEUR_SEP);
  if (!provider?.trim() || !depositId?.trim()) {
    return null;
  }
  return { provider: provider.trim(), depositId: depositId.trim() };
}
