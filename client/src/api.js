export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, credentials: 'same-origin' });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.details?.map(d => `${d.field}: ${d.message}`).join('; ') || data.error || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}
