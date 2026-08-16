// The console (frontend/) is a separate deployable built by the app team.
// Point this at wherever it's actually hosted; defaults to its local dev port.
export const CONSOLE_URL = (import.meta.env.VITE_CONSOLE_URL as string | undefined) ?? 'http://localhost:5173';
