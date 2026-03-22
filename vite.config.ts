import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'

// Vite plugin: server-side /api/intake endpoint
function intakeApiPlugin(): Plugin {
  let apiKey: string | undefined;

  return {
    name: 'intake-api',
    configResolved(config) {
      // Load all env vars (including non-VITE_ prefixed) from .env.local
      const env = loadEnv(config.mode, config.root, '');
      apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    },
    configureServer(server) {
      server.middlewares.use('/api/intake', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        // Read request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = JSON.parse(Buffer.concat(chunks).toString());

        if (!apiKey) {
          res.statusCode = 500;
          res.end('ANTHROPIC_API_KEY not set. Add it to .env.local');
          return;
        }

        // Load INTAKE.md rules for the system prompt
        const intakeMdPath = path.resolve(__dirname, 'knowledge-base/INTAKE.md');
        let intakeRules = '';
        try {
          intakeRules = fs.readFileSync(intakeMdPath, 'utf-8');
        } catch {
          intakeRules = 'Process text into the knowledge base by identifying which files and sections to update.';
        }

        const { text, inventory } = body;

        const systemPrompt = `You are a knowledge base intake processor. Your job is to analyze incoming text and determine how it should be merged into an existing knowledge base.

Here are the intake rules you must follow:

${intakeRules}

The knowledge base contains these files:
${JSON.stringify(inventory, null, 2)}

Analyze the user's text and return a JSON object with this exact structure:
{
  "summary": "Brief 1-2 sentence overview of what the text contains",
  "matches": [
    {
      "file": "filename.md (the slug, e.g. 'cloud11', 'mqdc', 'people')",
      "section": "The ## section heading this maps to (or empty string for file-level)",
      "action": "update | append | conflict | new_section",
      "summary": "What change to make and why",
      "content": "The actual markdown content to add or the updated text"
    }
  ],
  "conflicts": ["Description of any contradictions with existing content"],
  "newFiles": ["filename.md suggestions only if content truly doesn't fit any existing file"]
}

Rules:
- Prefer updating existing files over creating new ones
- Match information to the most specific file (e.g., MQDC info goes to mqdc.md, not index.md)
- Flag contradictions as conflicts — never silently override
- Mark uncertain/unverified info with (Unverified) prefix
- Always note the source context
- Return ONLY valid JSON, no markdown fences or extra text`;

        try {
          const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              system: systemPrompt,
              messages: [{ role: 'user', content: text }],
            }),
          });

          if (!apiRes.ok) {
            const errText = await apiRes.text();
            res.statusCode = apiRes.status;
            res.end(`Anthropic API error: ${errText}`);
            return;
          }

          const apiData = await apiRes.json();
          const content = apiData.content?.[0]?.text || '{}';

          // Parse the JSON from Claude's response (handle possible markdown fences)
          const jsonStr = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
          const parsed = JSON.parse(jsonStr);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(parsed));
        } catch (err: unknown) {
          res.statusCode = 500;
          const msg = err instanceof Error ? err.message : 'Unknown error';
          res.end(`Processing error: ${msg}`);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), intakeApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  assetsInclude: ['**/*.md'],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/dtgo-wiki.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/dtgo-wiki.[ext]',
      },
    },
  },
})
