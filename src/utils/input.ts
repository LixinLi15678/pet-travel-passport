export const sanitizeDecimalInput = (value: string, maxDecimals = 2): string => {
  const cleaned = (value || '').replace(/[^0-9.]/g, '');
  const [intPartRaw = '', ...rest] = cleaned.split('.');
  const decimals = rest.join('').slice(0, maxDecimals);
  const hasDecimal = cleaned.includes('.');
  if (hasDecimal) {
    const safeInt = intPartRaw || '0';
    return `${safeInt}.${decimals}`;
  }
  return intPartRaw;
};
