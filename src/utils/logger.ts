// Logger utility for uniform clean logs
const origLog = console.log.bind(console);
const origError = console.error.bind(console);

export function step(message: string) {
  origLog(`➤ ${message}`);
}

export function success(message: string) {
  origLog(`✅ ${message}`);
}

export function fail(message: string) {
  origError(`❌ ${message}`);
}

export function detail(message: string) {
  console.error(`  • ${message}`);
} 