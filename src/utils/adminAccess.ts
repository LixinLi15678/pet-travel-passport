// Admin access utilities

const parseAdminEmails = (): string[] => {
  const raw = process.env.REACT_APP_ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const allowList = parseAdminEmails();
  return allowList.length > 0 && allowList.includes(email.toLowerCase());
};

const resolveBasePath = (): string => {
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl || publicUrl === '/') {
    return '.';
  }
  return publicUrl === '.' ? '.' : publicUrl;
};

export const getAdminConsoleUrl = (): string => {
  const basePath = resolveBasePath();
  if (basePath === '.' || basePath === '') {
    return './admin-console.html';
  }
  const normalized = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `${normalized}/admin-console.html`;
};

export const openAdminConsole = (target: '_blank' | '_self' = '_blank'): void => {
  if (typeof window === 'undefined') return;
  const url = getAdminConsoleUrl();
  const features = target === '_blank' ? 'noopener,noreferrer' : undefined;
  window.open(url, target, features);
};
