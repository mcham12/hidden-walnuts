#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTION_NAMESPACE_ID = '6f7bb7f0d8064c7d8d3dbc7ba320ad6b';
const PREVIEW_NAMESPACE_ID = '9da2c6a1d97543c9b5edfbc084e68203';

const TARGETS = [
    { env: '', label: 'production', expectedId: PRODUCTION_NAMESPACE_ID },
    { env: 'preview', label: 'preview', expectedId: PREVIEW_NAMESPACE_ID },
];

function bindingIds(output) {
    return [...output.matchAll(/env\.PORTFOLIO_KV \(([0-9a-fA-F]{32})\)/g)].map((match) => match[1]);
}

function runDryRun(target) {
    const outdir = mkdtempSync(join(tmpdir(), 'preview-kv-'));
    try {
        const result = spawnSync(
            'npx',
            ['--yes', 'wrangler@4.62.0', 'deploy', '--dry-run', '--outdir', outdir, '--env', target.env],
            { cwd: REPO_ROOT, encoding: 'utf8' },
        );
        const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, '');
        if (result.error || result.status !== 0) {
            const detail = [result.error?.message, output.trim()].filter(Boolean).join('\n');
            return {
                failures: [detail || `${target.label}: wrangler exited ${result.status}`],
            };
        }
        const ids = bindingIds(output);
        if (ids.length !== 1) {
            return {
                failures: [`${target.label}: expected exactly one env.PORTFOLIO_KV (<32 hex chars>), found ${ids.length}`],
            };
        }
        return { id: ids[0] };
    } finally {
        rmSync(outdir, { recursive: true, force: true });
    }
}

function main() {
    const failures = [];
    const ids = {};

    for (const target of TARGETS) {
        const result = runDryRun(target);
        if (result.failures) {
            failures.push(...result.failures);
            continue;
        }
        ids[target.label] = result.id;
        if (result.id !== target.expectedId) {
            failures.push(`${target.label} env.PORTFOLIO_KV is ${result.id}, expected ${target.expectedId}`);
        }
    }

    if (ids.preview === PRODUCTION_NAMESPACE_ID) {
        failures.push(`preview env.PORTFOLIO_KV is ${PRODUCTION_NAMESPACE_ID}, the production namespace`);
    }

    if (failures.length > 0) {
        for (const failure of failures) {
            process.stdout.write(`${failure}\n`);
        }
        process.exitCode = 1;
        return;
    }

    process.stdout.write(`production ${ids.production}\n`);
    process.stdout.write(`preview ${ids.preview}\n`);
}

main();
