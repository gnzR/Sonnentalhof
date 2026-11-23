export function isDesktopClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol === 'file:') return true;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  return ua.includes('electron');
}
