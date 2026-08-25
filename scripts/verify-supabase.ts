import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const TEST_EMAILS = {
  userA: 'kortex-local-rls-a@example.invalid',
  userB: 'kortex-local-rls-b@example.invalid',
} as const;
const TEST_PASSWORD = 'Kortex-Local-Verification-2026!';
const EXPECTED_LOCAL_API_PORT = '54321';

interface LocalSupabaseConfiguration {
  apiUrl: string;
  publishableKey: string;
  serviceRoleKey: string;
}

interface FixtureIds {
  captures: {
    primary: string;
    ownCommit: string;
    foreignEntityCommit: string;
    foreignRelationshipCommit: string;
  };
  entities: Record<'contact' | 'company' | 'idea' | 'project' | 'meeting' | 'document', string>;
  spareEntities: Record<'contact' | 'company' | 'idea' | 'project' | 'meeting' | 'document', string>;
  relationship: string;
  nullableRelationship: string;
  tag: string;
  timelineEvent: string;
  nullableTimelineEvent: string;
  followUp: string;
  nullableFollowUp: string;
  interpretation: string;
}

interface RowScenario {
  table: string;
  match: Record<string, string>;
  attemptedUpdate: Record<string, unknown>;
}

interface CheckResults {
  passed: number;
  failures: string[];
}

function readLocalConfiguration(): LocalSupabaseConfiguration {
  const values = new Map<string, string>();
  for (const name of ['API_URL', 'PUBLISHABLE_KEY', 'ANON_KEY', 'SERVICE_ROLE_KEY'] as const) {
    const value = process.env[name];
    if (value) values.set(name, value);
  }

  if (!values.get('API_URL') || !values.get('SERVICE_ROLE_KEY') || !(values.get('PUBLISHABLE_KEY') || values.get('ANON_KEY'))) {
    const status = spawnSync('supabase', ['status', '-o', 'env'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (status.status !== 0) {
      throw new Error(`Unable to inspect the local Supabase stack: ${status.stderr.trim() || 'supabase status failed'}`);
    }
    for (const line of status.stdout.split('\n')) {
      const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (!match) continue;
      values.set(match[1], match[2].replace(/^"|"$/g, ''));
    }
  }

  const apiUrl = values.get('API_URL');
  const publishableKey = values.get('PUBLISHABLE_KEY') || values.get('ANON_KEY');
  const serviceRoleKey = values.get('SERVICE_ROLE_KEY');
  if (!apiUrl || !publishableKey || !serviceRoleKey) {
    throw new Error('The local Supabase API URL, publishable key, and service-role key are required.');
  }

  const parsedUrl = new URL(apiUrl);
  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (parsedUrl.protocol !== 'http:' || !loopbackHosts.has(parsedUrl.hostname) || parsedUrl.port !== EXPECTED_LOCAL_API_PORT) {
    throw new Error(`Refusing to run against non-local Supabase URL: ${parsedUrl.origin}`);
  }

  return { apiUrl, publishableKey, serviceRoleKey };
}

function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    realtime: { transport: WebSocket as never },
  });
}

function makeFixtureIds(): FixtureIds {
  const entityIds = () => ({
    contact: randomUUID(),
    company: randomUUID(),
    idea: randomUUID(),
    project: randomUUID(),
    meeting: randomUUID(),
    document: randomUUID(),
  });
  return {
    captures: {
      primary: randomUUID(),
      ownCommit: randomUUID(),
      foreignEntityCommit: randomUUID(),
      foreignRelationshipCommit: randomUUID(),
    },
    entities: entityIds(),
    spareEntities: entityIds(),
    relationship: randomUUID(),
    nullableRelationship: randomUUID(),
    tag: randomUUID(),
    timelineEvent: randomUUID(),
    nullableTimelineEvent: randomUUID(),
    followUp: randomUUID(),
    nullableFollowUp: randomUUID(),
    interpretation: randomUUID(),
  };
}

async function removeTestUsers(admin: SupabaseClient): Promise<void> {
  const testUserIds: string[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Unable to list local test users: ${error.message}`);
    for (const user of data.users) {
      if (user.email === TEST_EMAILS.userA || user.email === TEST_EMAILS.userB) {
        testUserIds.push(user.id);
      }
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  for (const userId of testUserIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Unable to remove local test user ${userId}: ${error.message}`);
  }
}

async function createConfirmedUser(admin: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: email.split('@')[0], purpose: 'local-rls-verification' },
  });
  if (error) throw new Error(`Unable to create local test user: ${error.message}`);
  return data.user.id;
}

async function signIn(client: SupabaseClient, email: string): Promise<void> {
  const { data, error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw new Error(`Unable to sign in ${email}: ${error.message}`);
  assert.ok(data.session, `Expected an authenticated local session for ${email}`);
}

async function insertRows(client: SupabaseClient, table: string, rows: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
  const { error } = await client.from(table).insert(rows);
  if (error) throw new Error(`Unable to seed ${table}: ${error.message}`);
}

async function seedUser(client: SupabaseClient, ownerId: string, ids: FixtureIds, label: string): Promise<void> {
  await insertRows(client, 'captures', Object.values(ids.captures).map((id, index) => ({
    id,
    owner_id: ownerId,
    input_type: 'text',
    raw_text: `${label} local verification capture ${index + 1}`,
  })));

  const primaryEntities = Object.entries(ids.entities).map(([entityType, id]) => ({
    id,
    owner_id: ownerId,
    entity_type: entityType,
    display_name: `${label} ${entityType}`,
    source_capture_id: ids.captures.primary,
  }));
  const spareEntities = Object.entries(ids.spareEntities).map(([entityType, id]) => ({
    id,
    owner_id: ownerId,
    entity_type: entityType,
    display_name: `${label} spare ${entityType}`,
  }));
  await insertRows(client, 'entities', [...primaryEntities, ...spareEntities]);

  await insertRows(client, 'contacts', {
    entity_id: ids.entities.contact,
    owner_id: ownerId,
    role: `${label} contact role`,
    company_entity_id: ids.entities.company,
  });
  await insertRows(client, 'companies', { entity_id: ids.entities.company, owner_id: ownerId, industry: `${label} industry` });
  await insertRows(client, 'ideas', { entity_id: ids.entities.idea, owner_id: ownerId, hypothesis: `${label} hypothesis` });
  await insertRows(client, 'projects', { entity_id: ids.entities.project, owner_id: ownerId, description: `${label} project` });
  await insertRows(client, 'meetings', { entity_id: ids.entities.meeting, owner_id: ownerId, raw_notes: `${label} meeting` });
  await insertRows(client, 'documents', { entity_id: ids.entities.document, owner_id: ownerId, body_text: `${label} document` });
  await insertRows(client, 'relationships', [
    {
      id: ids.relationship,
      owner_id: ownerId,
      source_entity_id: ids.entities.contact,
      target_entity_id: ids.entities.company,
      relationship_type: 'local_verification',
      context: `${label} relationship`,
      source_capture_id: ids.captures.primary,
    },
    {
      id: ids.nullableRelationship,
      owner_id: ownerId,
      source_entity_id: ids.spareEntities.idea,
      target_entity_id: ids.spareEntities.project,
      relationship_type: 'nullable_verification',
      context: `${label} nullable relationship`,
      source_capture_id: null,
    },
  ]);
  await insertRows(client, 'tags', { id: ids.tag, owner_id: ownerId, name: `${label} verification tag` });
  await insertRows(client, 'entity_tags', { owner_id: ownerId, entity_id: ids.entities.idea, tag_id: ids.tag });
  await insertRows(client, 'timeline_events', [
    {
      id: ids.timelineEvent,
      owner_id: ownerId,
      entity_id: ids.entities.project,
      capture_id: ids.captures.primary,
      event_kind: 'local_verification',
      title: `${label} timeline event`,
    },
    {
      id: ids.nullableTimelineEvent,
      owner_id: ownerId,
      entity_id: ids.spareEntities.project,
      capture_id: null,
      event_kind: 'nullable_verification',
      title: `${label} nullable timeline event`,
    },
  ]);
  await insertRows(client, 'follow_ups', [
    {
      id: ids.followUp,
      owner_id: ownerId,
      capture_id: ids.captures.primary,
      related_entity_id: ids.entities.contact,
      description: `${label} follow up`,
      date_interpretation: 'local verification',
    },
    {
      id: ids.nullableFollowUp,
      owner_id: ownerId,
      capture_id: null,
      related_entity_id: ids.spareEntities.contact,
      description: `${label} nullable follow up`,
      date_interpretation: 'local verification',
    },
  ]);
  await insertRows(client, 'ai_interpretations', {
    id: ids.interpretation,
    owner_id: ownerId,
    capture_id: ids.captures.primary,
    provider: 'local-verification',
    model: 'deterministic-fixture',
    schema_version: 1,
    structured_result: { purpose: 'local-rls-verification' },
  });
}

async function runCheck(results: CheckResults, name: string, check: () => Promise<void>): Promise<void> {
  try {
    await check();
    results.passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.failures.push(`${name}: ${message}`);
    console.error(`FAIL ${name}: ${message}`);
  }
}

async function expectInsertDenied(client: SupabaseClient, table: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await client.from(table).insert(row);
  assert.ok(error, `Expected ${table} insert to be rejected`);
}

async function verifyForeignRowProtection(
  results: CheckResults,
  userA: SupabaseClient,
  admin: SupabaseClient,
  scenario: RowScenario,
): Promise<void> {
  await runCheck(results, `${scenario.table}: User A cannot read User B row`, async () => {
    const { data, error } = await userA.from(scenario.table).select('*').match(scenario.match);
    assert.ifError(error);
    assert.deepEqual(data, []);
  });

  await runCheck(results, `${scenario.table}: User A cannot update User B row`, async () => {
    const before = await admin.from(scenario.table).select('*').match(scenario.match).single();
    assert.ifError(before.error);
    const attempt = await userA.from(scenario.table).update(scenario.attemptedUpdate).match(scenario.match).select('*');
    assert.ifError(attempt.error);
    assert.deepEqual(attempt.data, []);
    const after = await admin.from(scenario.table).select('*').match(scenario.match).single();
    assert.ifError(after.error);
    assert.deepEqual(after.data, before.data);
  });

  await runCheck(results, `${scenario.table}: User A cannot delete User B row`, async () => {
    const attempt = await userA.from(scenario.table).delete().match(scenario.match).select('*');
    assert.ifError(attempt.error);
    assert.deepEqual(attempt.data, []);
    const remaining = await admin.from(scenario.table).select('*').match(scenario.match).single();
    assert.ifError(remaining.error);
    assert.ok(remaining.data);
  });
}

function makeCommitResult(entityPrefix: string) {
  return {
    schemaVersion: 1,
    summary: 'Local commit verification',
    entities: [
      {
        temporaryId: `${entityPrefix}-contact`, type: 'contact', displayName: `${entityPrefix} Contact`,
        attributes: { role: 'Verifier' }, tags: ['Local verification'], confidence: 0.98, operation: 'create', needsReview: false,
      },
      {
        temporaryId: `${entityPrefix}-company`, type: 'company', displayName: `${entityPrefix} Company`,
        attributes: { industry: 'Testing' }, tags: ['Local verification'], confidence: 0.97, operation: 'create', needsReview: false,
      },
    ],
    relationships: [{
      sourceTemporaryId: `${entityPrefix}-contact`, targetTemporaryId: `${entityPrefix}-company`, type: 'works_at',
      context: 'Local commit verification', confidence: 0.96,
    }],
    followUps: [{ description: 'Verify the local baseline', dateInterpretation: 'No due date', dueAt: '' }],
    clarifications: [],
    overallConfidence: 0.97,
  };
}

async function verify(): Promise<void> {
  const configuration = readLocalConfiguration();
  const admin = createSupabaseClient(configuration.apiUrl, configuration.serviceRoleKey);
  const userAClient = createSupabaseClient(configuration.apiUrl, configuration.publishableKey);
  const userBClient = createSupabaseClient(configuration.apiUrl, configuration.publishableKey);
  const results: CheckResults = { passed: 0, failures: [] };

  await removeTestUsers(admin);
  try {
    const userAId = await createConfirmedUser(admin, TEST_EMAILS.userA);
    const userBId = await createConfirmedUser(admin, TEST_EMAILS.userB);
    await signIn(userAClient, TEST_EMAILS.userA);
    await signIn(userBClient, TEST_EMAILS.userB);

    const userAIds = makeFixtureIds();
    const userBIds = makeFixtureIds();
    await seedUser(userAClient, userAId, userAIds, 'User A');
    await seedUser(userBClient, userBId, userBIds, 'User B');

    const userBRows: RowScenario[] = [
      { table: 'profiles', match: { id: userBId }, attemptedUpdate: { display_name: 'tampered by User A' } },
      { table: 'captures', match: { id: userBIds.captures.primary }, attemptedUpdate: { raw_text: 'tampered by User A' } },
      { table: 'entities', match: { id: userBIds.entities.contact }, attemptedUpdate: { display_name: 'tampered by User A' } },
      { table: 'contacts', match: { entity_id: userBIds.entities.contact }, attemptedUpdate: { role: 'tampered by User A' } },
      { table: 'companies', match: { entity_id: userBIds.entities.company }, attemptedUpdate: { industry: 'tampered by User A' } },
      { table: 'ideas', match: { entity_id: userBIds.entities.idea }, attemptedUpdate: { hypothesis: 'tampered by User A' } },
      { table: 'projects', match: { entity_id: userBIds.entities.project }, attemptedUpdate: { description: 'tampered by User A' } },
      { table: 'meetings', match: { entity_id: userBIds.entities.meeting }, attemptedUpdate: { raw_notes: 'tampered by User A' } },
      { table: 'documents', match: { entity_id: userBIds.entities.document }, attemptedUpdate: { body_text: 'tampered by User A' } },
      { table: 'relationships', match: { id: userBIds.relationship }, attemptedUpdate: { context: 'tampered by User A' } },
      { table: 'tags', match: { id: userBIds.tag }, attemptedUpdate: { name: 'tampered by User A' } },
      { table: 'entity_tags', match: { entity_id: userBIds.entities.idea, tag_id: userBIds.tag }, attemptedUpdate: { owner_id: userAId } },
      { table: 'timeline_events', match: { id: userBIds.timelineEvent }, attemptedUpdate: { title: 'tampered by User A' } },
      { table: 'follow_ups', match: { id: userBIds.followUp }, attemptedUpdate: { description: 'tampered by User A' } },
      { table: 'ai_interpretations', match: { id: userBIds.interpretation }, attemptedUpdate: { model: 'tampered-by-user-a' } },
    ];

    for (const scenario of userBRows) {
      await verifyForeignRowProtection(results, userAClient, admin, scenario);
    }

    const ownerSpoofRows: Array<{ table: string; row: Record<string, unknown> }> = [
      { table: 'captures', row: { id: randomUUID(), owner_id: userBId, input_type: 'text', raw_text: 'owner spoof' } },
      { table: 'entities', row: { id: randomUUID(), owner_id: userBId, entity_type: 'idea', display_name: 'owner spoof' } },
      { table: 'contacts', row: { entity_id: userBIds.spareEntities.contact, owner_id: userBId, role: 'owner spoof' } },
      { table: 'companies', row: { entity_id: userBIds.spareEntities.company, owner_id: userBId, industry: 'owner spoof' } },
      { table: 'ideas', row: { entity_id: userBIds.spareEntities.idea, owner_id: userBId, hypothesis: 'owner spoof' } },
      { table: 'projects', row: { entity_id: userBIds.spareEntities.project, owner_id: userBId, description: 'owner spoof' } },
      { table: 'meetings', row: { entity_id: userBIds.spareEntities.meeting, owner_id: userBId, raw_notes: 'owner spoof' } },
      { table: 'documents', row: { entity_id: userBIds.spareEntities.document, owner_id: userBId, body_text: 'owner spoof' } },
      { table: 'relationships', row: { id: randomUUID(), owner_id: userBId, source_entity_id: userBIds.entities.idea, target_entity_id: userBIds.entities.project, relationship_type: 'owner_spoof' } },
      { table: 'tags', row: { id: randomUUID(), owner_id: userBId, name: 'owner spoof' } },
      { table: 'entity_tags', row: { owner_id: userBId, entity_id: userBIds.spareEntities.idea, tag_id: userBIds.tag } },
      { table: 'timeline_events', row: { id: randomUUID(), owner_id: userBId, entity_id: userBIds.entities.idea, event_kind: 'owner_spoof', title: 'owner spoof' } },
      { table: 'follow_ups', row: { id: randomUUID(), owner_id: userBId, related_entity_id: userBIds.entities.idea, description: 'owner spoof', date_interpretation: 'owner spoof' } },
      { table: 'ai_interpretations', row: { id: randomUUID(), owner_id: userBId, capture_id: userBIds.captures.primary, provider: 'owner-spoof', model: 'owner-spoof', schema_version: 1, structured_result: {} } },
    ];
    for (const scenario of ownerSpoofRows) {
      await runCheck(results, `${scenario.table}: User A cannot insert row owned by User B`, () => expectInsertDenied(userAClient, scenario.table, scenario.row));
    }

    await runCheck(results, 'relationships: User A cannot connect an owned entity to User B entity', async () => {
      await expectInsertDenied(userAClient, 'relationships', {
        id: randomUUID(), owner_id: userAId, source_entity_id: userAIds.entities.contact,
        target_entity_id: userBIds.entities.company, relationship_type: 'cross_tenant_attempt',
      });
    });
    await runCheck(results, 'contacts: User A cannot reference User B company entity', async () => {
      const { error } = await userAClient.from('contacts').update({ company_entity_id: userBIds.entities.company }).eq('entity_id', userAIds.entities.contact);
      assert.ok(error, 'Expected cross-tenant company reference to be rejected');
    });
    await runCheck(results, 'subtypes: User A cannot attach owned subtype row to User B entity', async () => {
      await expectInsertDenied(userAClient, 'ideas', {
        entity_id: userBIds.spareEntities.idea, owner_id: userAId, hypothesis: 'cross-tenant reference attempt',
      });
    });
    await runCheck(results, 'timeline_events: User A cannot reference User B entity', async () => {
      await expectInsertDenied(userAClient, 'timeline_events', {
        id: randomUUID(), owner_id: userAId, entity_id: userBIds.entities.idea,
        event_kind: 'cross_tenant_attempt', title: 'cross tenant',
      });
    });
    await runCheck(results, 'follow_ups: User A cannot reference User B entity', async () => {
      await expectInsertDenied(userAClient, 'follow_ups', {
        id: randomUUID(), owner_id: userAId, related_entity_id: userBIds.entities.idea,
        description: 'cross tenant', date_interpretation: 'cross tenant',
      });
    });

    const foreignReferenceAttempts: Array<{ name: string; table: string; row: Record<string, unknown> }> = [
      {
        name: 'entities.source_capture_id rejects User B capture', table: 'entities',
        row: { id: randomUUID(), owner_id: userAId, entity_type: 'idea', display_name: 'cross capture reference', source_capture_id: userBIds.captures.primary },
      },
      {
        name: 'relationships.source_capture_id rejects User B capture', table: 'relationships',
        row: { id: randomUUID(), owner_id: userAId, source_entity_id: userAIds.entities.idea, target_entity_id: userAIds.entities.project, relationship_type: 'foreign_capture_attempt', source_capture_id: userBIds.captures.primary },
      },
      {
        name: 'entity_tags.tag_id rejects User B tag', table: 'entity_tags',
        row: { owner_id: userAId, entity_id: userAIds.spareEntities.idea, tag_id: userBIds.tag },
      },
      {
        name: 'timeline_events.capture_id rejects User B capture', table: 'timeline_events',
        row: { id: randomUUID(), owner_id: userAId, entity_id: userAIds.entities.idea, capture_id: userBIds.captures.primary, event_kind: 'foreign_capture_attempt', title: 'cross capture' },
      },
      {
        name: 'follow_ups.capture_id rejects User B capture', table: 'follow_ups',
        row: { id: randomUUID(), owner_id: userAId, related_entity_id: userAIds.entities.idea, capture_id: userBIds.captures.primary, description: 'cross capture', date_interpretation: 'cross capture' },
      },
      {
        name: 'ai_interpretations.capture_id rejects User B capture', table: 'ai_interpretations',
        row: { id: randomUUID(), owner_id: userAId, capture_id: userBIds.captures.primary, provider: 'cross-capture', model: 'cross-capture', schema_version: 1, structured_result: {} },
      },
    ];
    for (const attempt of foreignReferenceAttempts) {
      await runCheck(results, attempt.name, () => expectInsertDenied(userAClient, attempt.table, attempt.row));
    }

    await runCheck(results, 'commit_capture: User A can commit an owned capture atomically', async () => {
      const { data, error } = await userAClient.rpc('commit_capture', {
        p_capture_id: userAIds.captures.ownCommit,
        p_result: makeCommitResult('Owned Commit'),
      });
      assert.ifError(error);
      assert.ok(data && typeof data === 'object' && 'primary_entity_id' in data);

      const capture = await userAClient.from('captures').select('processing_status,reviewed').eq('id', userAIds.captures.ownCommit).single();
      assert.ifError(capture.error);
      assert.equal(capture.data.processing_status, 'saved');
      assert.equal(capture.data.reviewed, true);
      const entities = await userAClient.from('entities').select('id').eq('source_capture_id', userAIds.captures.ownCommit);
      const relationships = await userAClient.from('relationships').select('id').eq('source_capture_id', userAIds.captures.ownCommit);
      const interpretations = await userAClient.from('ai_interpretations').select('id').eq('capture_id', userAIds.captures.ownCommit);
      assert.ifError(entities.error);
      assert.ifError(relationships.error);
      assert.ifError(interpretations.error);
      assert.equal(entities.data.length, 2);
      assert.equal(relationships.data.length, 1);
      assert.equal(interpretations.data.length, 1);
    });

    await runCheck(results, 'commit_capture: User B cannot see User A committed entities', async () => {
      const { data, error } = await userBClient.from('entities').select('id').eq('source_capture_id', userAIds.captures.ownCommit);
      assert.ifError(error);
      assert.deepEqual(data, []);
    });

    await runCheck(results, 'commit_capture: User A cannot commit User B capture', async () => {
      const { error } = await userAClient.rpc('commit_capture', {
        p_capture_id: userBIds.captures.primary,
        p_result: { ...makeCommitResult('Foreign Capture'), entities: [], relationships: [], followUps: [] },
      });
      assert.ok(error, 'Expected foreign capture commit to be rejected');
      const capture = await admin.from('captures').select('processing_status,reviewed').eq('id', userBIds.captures.primary).single();
      assert.ifError(capture.error);
      assert.equal(capture.data.processing_status, 'pending');
      assert.equal(capture.data.reviewed, false);
    });

    await runCheck(results, 'commit_capture: User B cannot commit User A capture', async () => {
      const { error } = await userBClient.rpc('commit_capture', {
        p_capture_id: userAIds.captures.foreignEntityCommit,
        p_result: { ...makeCommitResult('Reverse Foreign Capture'), entities: [], relationships: [], followUps: [] },
      });
      assert.ok(error, 'Expected reverse foreign capture commit to be rejected');
    });

    await runCheck(results, 'commit_capture: User A cannot reference User B existing entity', async () => {
      const result = {
        ...makeCommitResult('Foreign Entity'),
        entities: [{
          temporaryId: 'foreign-entity', type: 'contact', displayName: 'Foreign entity', attributes: {}, tags: [], confidence: 0.9,
          operation: 'reference', existingEntityId: userBIds.entities.contact, needsReview: false,
        }],
        relationships: [], followUps: [],
      };
      const { error } = await userAClient.rpc('commit_capture', { p_capture_id: userAIds.captures.foreignEntityCommit, p_result: result });
      assert.ok(error, 'Expected foreign existing entity reference to be rejected');
      const interpretations = await admin.from('ai_interpretations').select('id').eq('capture_id', userAIds.captures.foreignEntityCommit);
      assert.ifError(interpretations.error);
      assert.deepEqual(interpretations.data, []);
    });

    await runCheck(results, 'commit_capture: cross-tenant relationship endpoint rejects and rolls back', async () => {
      const result = {
        ...makeCommitResult('Foreign Endpoint'),
        entities: [{
          temporaryId: 'local-entity', type: 'idea', displayName: 'Rolled back entity', attributes: {}, tags: [], confidence: 0.9,
          operation: 'create', needsReview: false,
        }],
        relationships: [{
          sourceTemporaryId: 'local-entity', targetExistingId: userBIds.entities.idea,
          type: 'cross_tenant_attempt', confidence: 0.9,
        }],
        followUps: [],
      };
      const { error } = await userAClient.rpc('commit_capture', { p_capture_id: userAIds.captures.foreignRelationshipCommit, p_result: result });
      assert.ok(error, 'Expected cross-tenant relationship endpoint to be rejected');
      const entities = await admin.from('entities').select('id').eq('source_capture_id', userAIds.captures.foreignRelationshipCommit);
      const interpretations = await admin.from('ai_interpretations').select('id').eq('capture_id', userAIds.captures.foreignRelationshipCommit);
      const capture = await admin.from('captures').select('processing_status,reviewed').eq('id', userAIds.captures.foreignRelationshipCommit).single();
      assert.ifError(entities.error);
      assert.ifError(interpretations.error);
      assert.ifError(capture.error);
      assert.deepEqual(entities.data, []);
      assert.deepEqual(interpretations.data, []);
      assert.equal(capture.data.processing_status, 'pending');
      assert.equal(capture.data.reviewed, false);
    });
  } finally {
    await userAClient.auth.signOut();
    await userBClient.auth.signOut();
    await removeTestUsers(admin);
  }

  console.log(`\nLocal Supabase verification completed: ${results.passed} passed, ${results.failures.length} failed.`);
  if (results.failures.length > 0) {
    throw new Error(`Local Supabase verification failures:\n- ${results.failures.join('\n- ')}`);
  }
}

void verify().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
