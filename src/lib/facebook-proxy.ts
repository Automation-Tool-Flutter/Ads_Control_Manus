export function sanitizeFacebookResponse(value: unknown, secrets: string[]): unknown {
  if (Array.isArray(value)) return value.map(item => sanitizeFacebookResponse(item, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['access_token', 'appsecret_proof', 'signed_request'].includes(key.toLowerCase()))
    .map(([key, item]) => [key, sanitizeFacebookResponse(item, secrets)]));
  if (typeof value === 'string') {
    let text = value.replace(/([?&])(?:access_token|appsecret_proof)=[^&#]*/gi, '$1').replace(/\?&/g, '?').replace(/&&/g, '&');
    for (const secret of secrets.filter(Boolean)) text = text.split(secret).join('[redacted]').split(encodeURIComponent(secret)).join('[redacted]');
    return text;
  }
  return value;
}

export function validGraphPath(path: unknown): path is string {
  return typeof path === 'string' && /^\/(?:me|act_\d+|\d+(?:_\d+)*)(?:\/[a-zA-Z_]+)*$/.test(path);
}
