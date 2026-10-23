import type { NextApiRequest } from 'next';

// Browsers supply Origin for cross-origin mutations, including form submissions.
export function isAllowedMutation(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return req.headers['sec-fetch-site'] !== 'cross-site';
  try {
    const expected = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : undefined;
    const localOrigin = `http://${req.headers.host}`;
    return origin === expected || (!expected && origin === localOrigin);
  } catch {
    return false;
  }
}
