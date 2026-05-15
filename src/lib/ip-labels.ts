/**
 * Etiquetas amigables para IPs conocidas. Útil para identificar de qué sistema
 * viene el tráfico en el monitor sin tener que memorizar IPs.
 *
 * Para agregar una etiqueta nueva: agrega una entrada al objeto.
 * Ejemplo: '172.10.30.5': 'Backend Pagos'.
 */
export const IP_LABELS: Record<string, string> = {
	'127.0.0.1': 'Local',
	'172.10.30.1': 'Mide Dev'
};

export function ipLabel(ip?: string | null): string | undefined {
	if (!ip) return undefined;
	return IP_LABELS[ip];
}
