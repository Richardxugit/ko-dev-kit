// ko-dev-kit/tests/consistency.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ARCHETYPES } from '../src/detect.js';
import { ARCHETYPE_LABELS } from '../src/init.js';
import { ARCHETYPE_RESOURCES, getCommandEntries } from '../src/scaffold.js';
import { parseFrontmatter } from '../src/scaffold-core/index.js';

const templateDir = path.resolve('templates');

function archetypesFor(dir, name) {
  return ARCHETYPE_RESOURCES[dir]?.[name] ?? ARCHETYPES;
}

describe('archetype consistency', () => {
  it('ARCHETYPE_LABELS keys match ARCHETYPES', () => {
    expect(new Set(Object.keys(ARCHETYPE_LABELS))).toEqual(new Set(ARCHETYPES));
  });

  it('ARCHETYPE_RESOURCES references only valid archetypes', () => {
    for (const group of Object.values(ARCHETYPE_RESOURCES)) {
      for (const archetypeList of Object.values(group)) {
        for (const archetype of archetypeList) {
          expect(ARCHETYPES).toContain(archetype);
        }
      }
    }
  });

  it('every restricted resource has a matching template on disk', () => {
    const commandNames = new Set(getCommandEntries(templateDir).map(e => e.name));
    for (const [dir, group] of Object.entries(ARCHETYPE_RESOURCES)) {
      for (const name of Object.keys(group)) {
        if (dir === 'commands') {
          expect(commandNames.has(name), `missing template for commands/${name}`).toBe(true);
          continue;
        }
        const asFile = path.join(templateDir, dir, `${name}.md`);
        const asDir = path.join(templateDir, dir, name);
        expect(fs.pathExistsSync(asFile) || fs.pathExistsSync(asDir), `missing template for ${dir}/${name}`).toBe(true);
      }
    }
  });

  it('command templates have unique names', () => {
    const names = getCommandEntries(templateDir).map(e => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every archetype has a rule and an AGENTS.md template', () => {
    for (const archetype of ARCHETYPES) {
      expect(fs.pathExistsSync(path.join(templateDir, 'rules', `${archetype}.mdc`))).toBe(true);
      expect(fs.pathExistsSync(path.join(templateDir, 'agents-md', `${archetype}.md`))).toBe(true);
    }
  });
});

describe('command frontmatter', () => {
  const commandEntries = getCommandEntries(templateDir).map(e => ({ ...e, label: `commands/${e.name}.md` }));

  it.each(commandEntries)('$label has valid frontmatter', ({ file, name }) => {
    const content = fs.readFileSync(file, 'utf-8');
    const { data } = parseFrontmatter(content);
    expect(data).not.toBeNull();
    expect(data.name).toBe(name);
    expect(typeof data.description).toBe('string');
    expect(data.description.trim().length).toBeGreaterThan(0);
  });

  it.each(commandEntries)('$label declares only dependencies that exist on disk', ({ file }) => {
    const content = fs.readFileSync(file, 'utf-8');
    const { data } = parseFrontmatter(content);
    for (const skill of [...(data.skills ?? []), ...(data['skills-optional'] ?? [])]) {
      expect(fs.pathExistsSync(path.join(templateDir, 'skills', skill, 'SKILL.md')), `${file}: missing skill "${skill}"`).toBe(true);
    }
    for (const agent of data.agents ?? []) {
      expect(fs.pathExistsSync(path.join(templateDir, 'agents', `${agent}.md`)), `${file}: missing agent "${agent}"`).toBe(true);
    }
    for (const rule of data.rules ?? []) {
      expect(fs.pathExistsSync(path.join(templateDir, 'rules', `${rule}.mdc`)), `${file}: missing rule "${rule}"`).toBe(true);
    }
  });

  it.each(commandEntries)('$label required deps are installed for every archetype the command targets', ({ file, name }) => {
    const content = fs.readFileSync(file, 'utf-8');
    const { data } = parseFrontmatter(content);
    const commandArchetypes = archetypesFor('commands', name);
    for (const skill of data.skills ?? []) {
      for (const a of commandArchetypes) {
        expect(archetypesFor('skills', skill), `${file}: skill "${skill}" not installed for "${a}"`).toContain(a);
      }
    }
    for (const agent of data.agents ?? []) {
      for (const a of commandArchetypes) {
        expect(archetypesFor('agents', agent), `${file}: agent "${agent}" not installed for "${a}"`).toContain(a);
      }
    }
  });
});

describe('kit-wide staleness lint (dev-kit slice)', () => {
  const BANNED = [
    { name: 'ko-inception (removed command)', re: /ko-inception/ },
    { name: 'ko-lib-component (never existed)', re: /ko-lib-component/ },
    { name: 'ko-release without -verify (renamed)', re: /ko-release(?!-verify)/ },
  ];
  const REQUIRED = [
    { file: 'commands/ko-release-verify.md', token: 'Preflight' },
    { file: 'commands/ko-release-verify.md', token: 'read-only' },
    { file: 'commands/ko-pr-desc.md', token: 'Preflight' },
    { file: 'commands/ko-feature.md', token: 'Atlassian MCP' },
    { file: 'commands/ko-bugfix.md', token: 'Atlassian MCP' },
    { file: 'commands/ko-ds-component.md', token: 'Atlassian MCP' },
    { file: 'commands/ko-svc-lambda.md', token: '[REUSE]' },
    { file: 'commands/ko-svc-nest-app.md', token: '[ADAPT]' },
    { file: 'commands/ko-svc-lib.md', token: '[REUSE]' },
    { file: 'commands/ko-test.md', token: '[REUSE' },
    { file: 'agents/frontend-developer.md', token: 'real command output' },
    { file: 'agents/backend-developer.md', token: 'real command output' },
    { file: 'agents/design-system-engineer.md', token: 'real command output' },
    { file: 'agents/frontend-developer.md', token: 'NOT FIXED' },
    { file: 'agents/backend-developer.md', token: 'NOT FIXED' },
    { file: 'agents/design-system-engineer.md', token: 'NOT FIXED' },
    { file: 'agents/code-reviewer.md', token: 'diff hunk' },
    { file: 'agents/review-specialist.md', token: 'diff hunk' },
    { file: 'agents/review-specialist.md', token: 'do not rewrite' },
    { file: 'commands/ko-review-team.md', token: 'regression' },
  ];

  it.each(REQUIRED)('$file carries its pattern token "$token"', ({ file, token }) => {
    const content = fs.readFileSync(path.join(templateDir, file), 'utf-8');
    expect(content.includes(token), `${file} lost required token "${token}"`).toBe(true);
  });

  it('templates/ and README reference no removed commands', async () => {
    const files = [...(await listFilesRecursive(templateDir)).map(rel => path.join(templateDir, rel)), path.resolve('README.md')];
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      for (const { name, re } of BANNED) {
        expect(re.test(content), `${path.relative('.', file)} references ${name}`).toBe(false);
      }
    }
  });
});

async function listFilesRecursive(dir, base = dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFilesRecursive(full, base));
    else out.push(path.relative(base, full));
  }
  return out.sort();
}
