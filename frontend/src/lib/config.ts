// The Python API (api/) — owns metadata/thumbnail/clip generation and
// publish. Defaults to '/api' for same-origin Vercel single-project deployments,
// or 'http://localhost:8000/api' for local uvicorn dev.
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

