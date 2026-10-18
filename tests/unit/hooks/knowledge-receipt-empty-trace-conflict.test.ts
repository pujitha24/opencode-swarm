import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { commitEmptyRetrieval } from '../../../src/hooks/knowledge-receipt-ledger.js';
import { createSafeTestDir } from '../../helpers/safe-test-dir.js';

const cleanups: Array<() => void> = [];

afterEach(() => {
	while (cleanups.length > 0) cleanups.pop()?.();
});

function project(): string {
	const fixture = createSafeTestDir('empty-trace-conflict-');
	cleanups.push(fixture.cleanup);
	fs.mkdirSync(path.join(fixture.dir, '.git'));
	return fixture.dir;
}

const base = { trace_id: 'none', session_id: 'sess-1' };

describe('commitEmptyRetrieval immutability conflict classification', () => {
	test('same-args retry stays idempotent', async () => {
		const dir = project();
		const args = { ...base, task_id: 'T1', phase: 'P' };
		const first = await commitEmptyRetrieval(dir, args);
		const retry = await commitEmptyRetrieval(dir, args);
		expect(first.ok).toBe(true);
		expect(retry).toEqual(first);
	});

	test('differing task_id rejects with wrong_task, not store_unavailable', async () => {
		const dir = project();
		await commitEmptyRetrieval(dir, { ...base, task_id: 'T1', phase: 'P' });
		const result = await commitEmptyRetrieval(dir, {
			...base,
			task_id: 'T2',
			phase: 'P',
		});
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.code).toBe('wrong_task');
		expect(result.code).not.toBe('store_unavailable');
		expect(result.detail).toContain(
			'conflicting immutable empty retrieval for none/sess-1',
		);
	});

	test('omitted task_id or phase conflicts on the matching axis', async () => {
		const dir = project();
		await commitEmptyRetrieval(dir, { ...base, task_id: 'T1', phase: 'P' });
		const noTask = await commitEmptyRetrieval(dir, { ...base, phase: 'P' });
		const noPhase = await commitEmptyRetrieval(dir, {
			...base,
			task_id: 'T1',
		});
		expect(noTask.ok === false && noTask.code).toBe('wrong_task');
		expect(noPhase.ok === false && noPhase.code).toBe('wrong_phase');
	});

	test('grace_days drift maps to duplicate_conflicting_terminal', async () => {
		const dir = project();
		await commitEmptyRetrieval(dir, { ...base, grace_days: 7 });
		const result = await commitEmptyRetrieval(dir, { ...base, grace_days: 9 });
		expect(result.ok === false && result.code).toBe(
			'duplicate_conflicting_terminal',
		);
	});

	test('genuine store failure still reports store_unavailable', async () => {
		const dir = project();
		// A regular file where the .swarm directory must live makes the store unusable.
		fs.writeFileSync(path.join(dir, '.swarm'), 'not a directory');
		const result = await commitEmptyRetrieval(dir, base);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.code).toBe('store_unavailable');
	});
});
