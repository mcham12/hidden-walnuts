#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LINT = join(REPO_ROOT, 'scripts', 'lint.mjs');

const CASES = [
    {
        name: 'declaration',
        fileName: 'declaration.mjs',
        source: 'async function handleImageUpload(request, env) {\n    return null;\n}\n',
        fail: false,
    },
    {
        name: 'call',
        fileName: 'call.mjs',
        source: 'async function demo(request, env) {\n    return await handleImageUpload(request, env);\n}\n',
        fail: true,
    },
    {
        name: 'alias',
        fileName: 'alias.mjs',
        source: 'const upload = handleImageUpload;\n',
        fail: true,
    },
    {
        name: 'method call',
        fileName: 'method.mjs',
        source: 'helpers.handleImageUpload(req);\n',
        fail: true,
    },
];

const dir = mkdtempSync(join(tmpdir(), 'hw-lint-rule-'));
let failed = 0;
try {
    for (const testCase of CASES) {
        const file = join(dir, testCase.fileName);
        writeFileSync(file, testCase.source);
        const result = spawnSync(process.execPath, [LINT, file], {
            cwd: REPO_ROOT,
            encoding: 'utf8',
        });
        const stdout = result.stdout || '';
        const reported = stdout.includes('no-handle-image-upload');
        const passed = testCase.fail
            ? result.status === 1 && reported
            : result.status === 0 && !reported && stdout.includes('lint: 1 files ok');
        process.stdout.write(`${passed ? 'ok' : 'FAIL'}  ${testCase.name}\n`);
        if (!passed) {
            failed += 1;
            if (stdout) process.stdout.write(stdout);
            if (result.stderr) process.stderr.write(result.stderr);
        }
    }
} finally {
    rmSync(dir, { recursive: true, force: true });
}

if (failed > 0) process.exit(1);
