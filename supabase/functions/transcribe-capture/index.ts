import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const requestId = crypto.randomUUID();
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'Transcription unavailable' }), { status: 503, headers: cors });
    const form = await request.formData(); const audio = form.get('audio');
    if (!(audio instanceof File) || audio.size < 1 || audio.size > 25 * 1024 * 1024) return new Response(JSON.stringify({ error: 'Invalid audio' }), { status: 400, headers: cors });
    const upstream = new FormData(); upstream.append('file', audio, 'capture.m4a'); upstream.append('model', Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'gpt-4o-mini-transcribe'); upstream.append('response_format', 'json');
    const provider = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: upstream });
    if (!provider.ok) { console.error(JSON.stringify({ requestId, stage: 'provider', status: provider.status })); return new Response(JSON.stringify({ error: 'Transcription unavailable', requestId }), { status: 502, headers: cors }); }
    const result = await provider.json(); return new Response(JSON.stringify({ text: result.text }), { headers: cors });
  } catch (_error) { console.error(JSON.stringify({ requestId, stage: 'transcription' })); return new Response(JSON.stringify({ error: 'Transcription failed', requestId }), { status: 500, headers: cors }); }
});
