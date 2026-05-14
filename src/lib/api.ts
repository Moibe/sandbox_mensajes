export const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const API_PORT = (import.meta.env.VITE_API_PORT as string | undefined) ?? '8082';
const ENV_API_HOST = import.meta.env.VITE_API_HOST as string | undefined;

/**
 * Host:puerto del API para mostrar en UI y para abrir /docs.
 * Default: deriva del `window.location.hostname` + puerto del API (8082) —
 * funciona tanto en localhost como en el server. Override vía VITE_API_HOST.
 * Devuelve cadena vacía durante SSR.
 */
export function getApiHost(): string {
	if (ENV_API_HOST) return ENV_API_HOST;
	if (typeof window === 'undefined') return '';
	return `${window.location.hostname}:${API_PORT}`;
}

export const APP_VERSION = '0.1.0';

export const APP_ORIGIN = 'sandbox-mensajes-ui';
