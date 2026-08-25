import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

async function verify() {
  const url = process.env.API_URL; const key = process.env.PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Start local Supabase and export API_URL/PUBLISHABLE_KEY first.');
  const first = createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket as never } });
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`; const password = `Kortex-${suffix}-safe`;
  const { data: auth, error: authError } = await first.auth.signUp({ email: `owner-${suffix}@example.com`, password });
  assert.ifError(authError); assert.ok(auth.user); assert.ok(auth.session);
  const { data: capture, error: captureError } = await first.from('captures').insert({ owner_id: auth.user.id, input_type: 'text', raw_text: 'Met local schema test contact at North Test.' }).select('id').single();
  assert.ifError(captureError); assert.ok(capture);
  const result = { schemaVersion: 1, summary: 'Two test entities', entities: [
    { temporaryId: 'person', type: 'contact', displayName: 'Local Schema Contact', subtitle: 'Founder', attributes: { role: 'Founder', location: 'Stockholm' }, tags: ['Verification'], confidence: .98, operation: 'create', needsReview: false },
    { temporaryId: 'company', type: 'company', displayName: 'North Test', attributes: { industry: 'Design', location: 'Stockholm' }, tags: ['Verification'], confidence: .96, operation: 'create', needsReview: false },
  ], relationships: [{ sourceTemporaryId: 'person', targetTemporaryId: 'company', type: 'runs', confidence: .97 }], followUps: [], clarifications: [], overallConfidence: .97 };
  const { data: committed, error: commitError } = await first.rpc('commit_capture', { p_capture_id: capture.id, p_result: result });
  assert.ifError(commitError); assert.ok(committed?.primary_entity_id);
  const { count: entityCount, error: entityError } = await first.from('entities').select('*', { count: 'exact', head: true });
  const { count: relationshipCount, error: relationshipError } = await first.from('relationships').select('*', { count: 'exact', head: true });
  assert.ifError(entityError); assert.ifError(relationshipError); assert.equal(entityCount, 2); assert.equal(relationshipCount, 1);
  const second = createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket as never } });
  const { data: secondAuth, error: secondAuthError } = await second.auth.signUp({ email: `other-${suffix}@example.com`, password });
  assert.ifError(secondAuthError); assert.ok(secondAuth.session);
  const { count: isolatedCount, error: isolationError } = await second.from('entities').select('*', { count: 'exact', head: true });
  assert.ifError(isolationError); assert.equal(isolatedCount, 0);
  console.log('Verified: migration, controlled commit RPC, typed persistence, relationships, and owner RLS isolation.');
}
void verify();
