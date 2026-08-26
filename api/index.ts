// Vercel serverless entry — wraps the existing Express app (src/app.ts)
// without touching it. Zero changes to backend business code.
import app from '../src/app';

export default app;

// Serverless-friendly config: Node runtime, no body parsing by Vercel
// (Express handles JSON bodies itself).
export const config = {
  api: {
    bodyParser: true,
  },
  maxDuration: 30,
};
