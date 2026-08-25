import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const attributeKeys = ['location','role','title','context','clients','company','industry','size','website','description','original_thought','hypothesis','raw_notes','text','source','reference_url','stage','status','how_met','languages','expertise'] as const;
const attributesSchema = { type: 'object', additionalProperties: false, required: [...attributeKeys], properties: Object.fromEntries(attributeKeys.map(key => [key, { type: ['string','null'], maxLength: 1200 }])) };
const entityProperties = {
  temporaryId: { type: 'string', maxLength: 80 }, type: { type: 'string', enum: ['contact','company','idea','project','meeting','document'] },
  displayName: { type: 'string', maxLength: 180 }, subtitle: { type: ['string','null'], maxLength: 240 }, summary: { type: ['string','null'], maxLength: 800 }, status: { type: ['string','null'], maxLength: 80 },
  attributes: attributesSchema, tags: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 60 } },
  confidence: { type: 'number', minimum: 0, maximum: 1 }, existingEntityId: { type: ['string','null'] }, matchReason: { type: ['string','null'], maxLength: 300 }, operation: { type: 'string', enum: ['create','update','reference'] }, needsReview: { type: 'boolean' },
};
const schema = {
  type: 'object', additionalProperties: false, required: ['schemaVersion','summary','entities','relationships','followUps','clarifications','overallConfidence'],
  properties: {
    schemaVersion: { type: 'integer', enum: [1] }, summary: { type: 'string', maxLength: 500 }, overallConfidence: { type: 'number', minimum: 0, maximum: 1 },
    entities: { type: 'array', maxItems: 30, items: { type: 'object', additionalProperties: false, required: Object.keys(entityProperties), properties: entityProperties } },
    relationships: { type: 'array', maxItems: 60, items: { type: 'object', additionalProperties: false, required: ['sourceTemporaryId','sourceExistingId','targetTemporaryId','targetExistingId','type','context','confidence'], properties: { sourceTemporaryId: { type: ['string','null'] }, sourceExistingId: { type: ['string','null'] }, targetTemporaryId: { type: ['string','null'] }, targetExistingId: { type: ['string','null'] }, type: { type: 'string', pattern: '^[a-z][a-z0-9_]{1,79}$' }, context: { type: ['string','null'], maxLength: 800 }, confidence: { type: 'number', minimum: 0, maximum: 1 } } } },
    followUps: { type: 'array', maxItems: 20, items: { type: 'object', additionalProperties: false, required: ['description','dateInterpretation','dueAt','relatedEntityId'], properties: { description: { type: 'string', maxLength: 300 }, dateInterpretation: { type: 'string', maxLength: 120 }, dueAt: { type: ['string','null'] }, relatedEntityId: { type: ['string','null'] } } } },
    clarifications: { type: 'array', maxItems: 20, items: { type: 'object', additionalProperties: false, required: ['id','question','entityTemporaryId','optional'], properties: { id: { type: 'string', maxLength: 80 }, question: { type: 'string', maxLength: 300 }, entityTemporaryId: { type: ['string','null'] }, optional: { type: 'boolean' } } } },
  },
};

function omitNull(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitNull);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== null).map(([key, child]) => [key, omitNull(child)]));
  return value;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const requestId = crypto.randomUUID();
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    const body = await request.json();
    if (typeof body.rawText !== 'string' || body.rawText.trim().length < 1 || body.rawText.length > 20000 || !['text','voice'].includes(body.inputType) || !Array.isArray(body.knownEntities)) return new Response(JSON.stringify({ error: 'Invalid capture' }), { status: 400, headers: cors });
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'AI unavailable', retryable: true }), { status: 503, headers: cors });
    const known = body.knownEntities.slice(0, 250).map((item: Record<string, unknown>) => ({ id: item.id, type: item.type, displayName: item.displayName, subtitle: item.subtitle, tags: item.tags }));
    const prompt = `You are the structured capture interpreter for Kortex, a personal intelligence system. Extract only claims present in USER_CAPTURE. Never invent missing names or facts. Preserve original idea wording in attributes.original_thought. Resolve against KNOWN_ENTITIES: use operation=reference for unchanged matches and update only when the capture adds facts. At medium confidence, set needsReview=true and add a concise clarification. Use temporary IDs for proposed entities and exact known UUIDs for existing endpoints. Relationships are lowercase snake_case. A company with no spoken name should have a descriptive placeholder and needsReview=true. Dates may retain a concise natural interpretation when exact date is uncertain.\nKNOWN_ENTITIES=${JSON.stringify(known)}\nUSER_CAPTURE=${JSON.stringify(body.rawText)}`;
    const openAIResponse = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-5-mini', input: prompt, text: { format: { type: 'json_schema', name: 'kortex_capture', strict: true, schema } } }) });
    if (!openAIResponse.ok) { console.error(JSON.stringify({ requestId, stage: 'provider', status: openAIResponse.status })); return new Response(JSON.stringify({ error: 'AI unavailable', retryable: true, requestId }), { status: 502, headers: cors }); }
    const response = await openAIResponse.json();
    const outputText = response.output_text ?? response.output?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? []).find((item: { type: string }) => item.type === 'output_text')?.text;
    if (!outputText) throw new Error('Provider returned no structured output');
    return new Response(JSON.stringify(omitNull(JSON.parse(outputText))), { headers: cors });
  } catch (_error) {
    console.error(JSON.stringify({ requestId, stage: 'interpretation' }));
    return new Response(JSON.stringify({ error: 'Interpretation failed', retryable: true, requestId }), { status: 500, headers: cors });
  }
});
