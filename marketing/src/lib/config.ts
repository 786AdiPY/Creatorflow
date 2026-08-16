// The Python API (backend-api/) — owns metadata/thumbnail/clip generation and
// publish. Defaults to its local dev port.
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
