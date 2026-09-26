// Single Vercel Function for the whole API. vercel.json rewrites every
// /api/<path> request here as /api?__path=<path>; routing is in server/router.ts.
import { handle } from '../server/router.js';

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
