import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

const HOST = '127.0.0.1';
const PORT = 8082;
const API_DIR = '..\\notificaciones_twilio';
const VENV_BIN = `${API_DIR}\\venv\\Scripts`;

function isPortInUse() {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		socket.setTimeout(500);
		socket
			.once('connect', () => {
				socket.destroy();
				resolve(true);
			})
			.once('timeout', () => {
				socket.destroy();
				resolve(false);
			})
			.once('error', () => {
				resolve(false);
			})
			.connect(PORT, HOST);
	});
}

const inUse = await isPortInUse();

if (inUse) {
	console.log(`\x1b[32m✓ FastAPI ya está corriendo en http://${HOST}:${PORT} — no se relanza.\x1b[0m`);
	process.exit(0);
}

console.log('\x1b[36m→ pip install -r requirements.txt (sincronizando dependencias)…\x1b[0m');
const pip = spawnSync(
	`${VENV_BIN}\\pip.exe`,
	['install', '-q', '-r', `${API_DIR}\\requirements.txt`],
	{ stdio: 'inherit', shell: false }
);
if (pip.status !== 0) {
	console.error('\x1b[31m✗ pip install falló — abortando arranque de la API.\x1b[0m');
	process.exit(pip.status ?? 1);
}

const uvicorn = spawn(
	`${VENV_BIN}\\uvicorn.exe`,
	[
		'main:app',
		'--app-dir',
		API_DIR,
		'--port',
		String(PORT),
		'--reload',
		'--reload-dir',
		API_DIR
	],
	{ stdio: 'inherit', shell: false }
);

uvicorn.on('exit', (code) => process.exit(code ?? 0));
