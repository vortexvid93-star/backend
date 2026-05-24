/** Normalise MSISDN pour PawaPay (Congo : indicatif 242). */
export function normalizePawaPayPhone(
  phone: string,
  country = 'CG',
): string {
  let msisdn = phone.replace(/\s+/g, '').replace(/^\+/, '');
  const cc = country.toUpperCase() === 'CG' ? '242' : '';

  if (cc && !msisdn.startsWith(cc)) {
    if (msisdn.startsWith('0')) {
      msisdn = cc + msisdn.slice(1);
    } else if (msisdn.length <= 9) {
      msisdn = cc + msisdn;
    }
  }

  return msisdn;
}
