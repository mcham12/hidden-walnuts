#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(SELF), '..');
const PATTERN_EXEMPT = new Set([
    resolve(SELF),
    resolve(REPO_ROOT, 'scripts/lint-rule-check.mjs'),
]);

/** @param {string} sourcePath */
function patternExempt(sourcePath) {
    return PATTERN_EXEMPT.has(resolve(sourcePath));
}

/**
 * @typedef {object} PatternRule
 * @property {string} id
 * @property {RegExp} pattern         global
 * @property {RegExp} allowedPrefix
 * @property {string} message
 */

/** @type {readonly PatternRule[]} */
const RULES = [
    {
        id: 'no-handle-image-upload',
        pattern: /\bhandleImageUpload\b/g,
        allowedPrefix: /(?:^|\s)function\s+$/,
        message: 'handleImageUpload is the disabled Cloudflare Images upload helper. Portfolio images are GitHub-hosted URLs. Do not call, alias, or re-enable it.',
    },
];

/** @typedef {{ file: string, line: number, column: number, rule: string, message: string }} Violation */

/** @returns {string[]} */
function listSourceFiles() {
    const output = execFileSync(
        'git',
        ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    const seen = new Set();
    /** @type {string[]} */
    const files = [];
    for (const entry of output.split('\0')) {
        if (!entry || seen.has(entry)) continue;
        if (!entry.endsWith('.js') && !entry.endsWith('.mjs')) continue;
        if (!existsSync(join(REPO_ROOT, entry))) continue;
        seen.add(entry);
        files.push(entry);
    }
    return files;
}

/**
 * `node --check` on a .js file misses syntax errors after `export` on Node 22.
 * @param {string} file
 * @param {string} source
 * @returns {Violation[]}
 */
function checkModuleSyntax(file, source) {
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
        input: source,
        encoding: 'utf8',
    });
    if (result.status === 0) return [];
    const stderr = result.stderr || '';
    const lineMatch = stderr.match(/\[stdin\]:(\d+)/);
    const line = lineMatch ? Number(lineMatch[1]) : 1;
    const syntaxLine = stderr
        .split('\n')
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith('SyntaxError:'))
        || 'SyntaxError';
    return [{ file, line, column: 1, rule: 'syntax', message: syntaxLine }];
}

/**
 * @param {string} file
 * @param {string} source
 * @param {readonly PatternRule[]} rules
 * @returns {Violation[]}
 */
function checkPatternRules(file, source, rules) {
    /** @type {Violation[]} */
    const violations = [];
    const lines = source.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (/^\s*\/\//.test(line)) continue;
        for (const rule of rules) {
            rule.pattern.lastIndex = 0;
            let match = rule.pattern.exec(line);
            while (match) {
                const prefix = line.slice(0, match.index);
                if (!rule.allowedPrefix.test(prefix)) {
                    violations.push({
                        file,
                        line: index + 1,
                        column: match.index + 1,
                        rule: rule.id,
                        message: rule.message,
                    });
                }
                match = rule.pattern.exec(line);
            }
        }
    }
    return violations;
}

function main() {
    const args = process.argv.slice(2);
    const files = args.length > 0 ? args : listSourceFiles();
    /** @type {Violation[]} */
    const violations = [];
    for (const file of files) {
        const sourcePath = isAbsolute(file) ? file : join(REPO_ROOT, file);
        const source = readFileSync(sourcePath, 'utf8');
        violations.push(...checkModuleSyntax(file, source));
        if (!patternExempt(sourcePath)) {
            violations.push(...checkPatternRules(file, source, RULES));
        }
    }
    violations.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.column - right.column);
    if (violations.length > 0) {
        for (const violation of violations) {
            process.stdout.write(`${violation.file}:${violation.line}:${violation.column} ${violation.rule} ${violation.message}\n`);
        }
        process.exitCode = 1;
        return;
    }
    process.stdout.write(`lint: ${files.length} files ok\n`);
}

main();
