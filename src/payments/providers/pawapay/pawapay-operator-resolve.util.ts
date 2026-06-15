import { normalizePawaPayPhone } from './pawapay-phone.util';

/** Préfixes locaux Congo-Brazzaville (après indicatif 242). */
const CG_MTN_PREFIXES = [
  '060',
  '061',
  '062',
  '063',
  '064',
  '065',
  '066',
  '067',
  '068',
  '069',
];
const CG_AIRTEL_PREFIXES = [
  '050',
  '051',
  '052',
  '053',
  '055',
  '057',
  '059',
  '054',
  '056',
  '058',
  '040',
  '041',
  '042',
  '043',
  '044',
  '045',
  '046',
  '047',
  '048',
  '049',
];

export const PAWAPAY_PROVIDER_MTN_COG = 'MTN_MOMO_COG';
export const PAWAPAY_PROVIDER_AIRTEL_COG = 'AIRTEL_COG';

/** Alias libellés front → codes PawaPay. */
const PROVIDER_ALIASES: Record<string, string> = {
  CG_MTNMOBILEMONEY: PAWAPAY_PROVIDER_MTN_COG,
  MTN: PAWAPAY_PROVIDER_MTN_COG,
  MTN_MOMO: PAWAPAY_PROVIDER_MTN_COG,
  CG_AIRTELMONEY: PAWAPAY_PROVIDER_AIRTEL_COG,
  AIRTEL: PAWAPAY_PROVIDER_AIRTEL_COG,
  AIRTEL_OAPI_COG: PAWAPAY_PROVIDER_AIRTEL_COG,
};

export function normalizePawaPayProviderCode(
  operator: string | undefined | null,
): string | null {
  if (!operator?.trim()) {
    return null;
  }
  const key = operator.trim().toUpperCase();
  return PROVIDER_ALIASES[key] ?? operator.trim();
}

/** Déduit MTN ou Airtel Congo à partir du MSISDN. */
export function resolvePawaPayOperator(
  phone: string,
  country = 'CG',
): string | null {
  const msisdn = normalizePawaPayPhone(phone, country);
  if (country.toUpperCase() !== 'CG') {
    return null;
  }

  let localPrefix: string;
  if (msisdn.startsWith('242') && msisdn.length >= 6) {
    localPrefix = msisdn.slice(3, 6);
  } else if (msisdn.length >= 3) {
    localPrefix = msisdn.slice(0, 3);
  } else {
    return null;
  }

  if (CG_MTN_PREFIXES.includes(localPrefix)) {
    return PAWAPAY_PROVIDER_MTN_COG;
  }
  if (CG_AIRTEL_PREFIXES.includes(localPrefix)) {
    return PAWAPAY_PROVIDER_AIRTEL_COG;
  }
  return null;
}
