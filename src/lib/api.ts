export const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const API_PORT = (import.meta.env.VITE_API_PORT as string | undefined) ?? '8082';
const ENV_API_HOST = import.meta.env.VITE_API_HOST as string | undefined;

/**
 * Host:puerto del API para mostrar en UI y para abrir /docs.
 * En el browser SIEMPRE deriva del `window.location.hostname` + API_PORT —
 * así el chip y el link de Docs reflejan el host real desde el que se está
 * sirviendo el front (localhost en local, IP/dominio del server en prod).
 * VITE_API_HOST solo se usa como fallback en SSR/build-time (no aplica con
 * SSR deshabilitado, pero queda como red de seguridad).
 */
export function getApiHost(): string {
	if (typeof window !== 'undefined') {
		return `${window.location.hostname}:${API_PORT}`;
	}
	return ENV_API_HOST ?? '';
}

export const APP_VERSION = '0.1.1';

export const APP_ORIGIN = 'sandbox-mensajes-ui';
