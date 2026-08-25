import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const schema = {
  type: 'object', additionalProperties: false, required: ['answer', 'entityIds', 'evidence'],
  properties: {
    answer: { type: 'string', maxLength: 1600 },
    entityIds: { type: 'array', maxItems: 12, items: { type: 'string', format: 'uuid' } },
    evidence: { type: 'array', maxItems: 12, items: { type: 'object', additionalProperties: false, required: ['text', 'source', 'entityIds'], properties: {
      text: { type: 'string', maxLength: 400 }, source: { type: 'string', enum: ['memory', 'inference'] }, entityIds: { type: 'array', maxItems: 8, items: { type: 'string', format: 'uuid' } },
    } } },
  },
};

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const requestId = crypto.randomUUID();
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const body = await request.json();
    if (typeof body.question !== 'string' || body.question.trim().length < 2 || body.question.length > 2000) return new Response(JSON.stringify({ error: 'Invalid question' }), { status: 400, headers: cors });
    const [entityResult, relationshipResult] = await Promise.all([
      client.from('entities').select('id,entity_type,display_name,subtitle,summary,status,tags_cache,knowledge_fields,updated_at').order('updated_at', { ascending: false }).limit(500),
      client.from('relationships').select('source_entity_id,target_entity_id,relationship_type,context,confidence').order('updated_at', { ascending: false }).limit(1500),
    ]);
    const databaseError = entityResult.error ?? relationshipResult.error;
    if (databaseError) throw databaseError;
    const contextId = typeof body.contextEntityId === 'string' ? body.contextEntityId : null;
    const memory = { entities: entityResult.data ?? [], relationships: relationshipResult.data ?? [], selected_entity_id: contextId };
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'AI unavailable', retryable: true }), { status: 503, headers: cors });
    const prompt = `Answer the user's question using only KORTEX_MEMORY. Do not add external facts. If the memory is insufficient, say so directly. entityIds must contain only IDs present in KORTEX_MEMORY. Mark a statement as memory when explicit in an entity or relationship; mark it inference only when you combine those records. Be concise and useful.\nQUESTION=${JSON.stringify(body.question)}\nKORTEX_MEMORY=${JSON.stringify(memory)}`;
    const provider = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-5-mini', input: prompt, text: { format: { type: 'json_schema', name: 'kortex_answer', strict: true, schema } } }) });
    if (!provider.ok) { console.error(JSON.stringify({ requestId, stage: 'provider', status: provider.status })); return new Response(JSON.stringify({ error: 'AI unavailable', retryable: true, requestId }), { status: 502, headers: cors }); }
    const response = await provider.json();
    const outputText = response.output_text ?? response.output?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? []).find((item: { type: string }) => item.type === 'output_text')?.text;
    if (!outputText) throw new Error('No answer');
    const parsed = JSON.parse(outputText);
    const allowed = new Set((entityResult.data ?? []).map(item => item.id));
    parsed.entityIds = parsed.entityIds.filter((id: string) => allowed.has(id));
    parsed.evidence = parsed.evidence.map((item: { entityIds: string[] }) => ({ ...item, entityIds: item.entityIds.filter(id => allowed.has(id)) }));
    return new Response(JSON.stringify(parsed), { headers: cors });
  } catch (_error) {
    console.error(JSON.stringify({ requestId, stage: 'answer' }));
    return new Response(JSON.stringify({ error: 'Answer failed', retryable: true, requestId }), { status: 500, headers: cors });
  }
});
