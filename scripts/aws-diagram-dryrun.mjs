#!/usr/bin/env node
// Dry-run: generate a sample AWS diagram following the ko-solution-design
// AWS diagram playbook, then statically verify it against the icon catalogs.
// Mirrors what an agent would produce when running /ko-solution-design.
import fs from 'node:fs';
import path from 'node:path';

const REF = path.join(import.meta.dirname, '..', 'templates', 'skills', 'workflow-refs', 'references');
const ICONS_DIR = path.join(REF, 'aws-diagram', 'icons');

// ---- 1. build the stencil-name ground truth from the catalogs ----
const known = new Set();
for (const f of fs.readdirSync(ICONS_DIR).filter((f) => f.endsWith('.md'))) {
  const body = fs.readFileSync(path.join(ICONS_DIR, f), 'utf-8');
  for (const m of body.matchAll(/\|\s*`([a-z0-9_]+)`\s*\|/g)) known.add(m[1]);
}
console.log(`catalog stencil names loaded: ${known.size}`);

// ---- 2. generate the sample diagram per the playbook rules ----
const icon = (id, x, name, label) => `
        <mxCell id="${id}" value="&lt;b&gt;${label}&lt;/b&gt;" style="sketch=0;outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=#232F3E;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.${name};" vertex="1" parent="1">
          <mxGeometry x="${x}" y="140" width="78" height="78" as="geometry" />
        </mxCell>`;

const edge = (id, src, dst, extra = '') => `
        <mxCell id="${id}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=2;${extra}" edge="1" source="${src}" target="${dst}" parent="1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;

const xml = `<mxfile host="ko-solution-design" version="24.0.0">
  <diagram id="sample" name="Sample Serverless API">
    <mxGraphModel dx="2800" dy="1600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2400" pageHeight="1400" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="bg" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#F5F5F5;strokeColor=none;" vertex="1" parent="1">
          <mxGeometry x="0" y="0" width="2400" height="1400" as="geometry" />
        </mxCell>
        <mxCell id="title" value="&lt;b&gt;Sample Serverless API&lt;/b&gt;&lt;br&gt;ko-solution-design dry-run | 2026-11-26 | v1" style="text;html=1;align=left;verticalAlign=top;whiteSpace=wrap;rounded=0;fontSize=14;spacing=8;" vertex="1" parent="1">
          <mxGeometry x="40" y="30" width="420" height="60" as="geometry" />
        </mxCell>
        <mxCell id="awscloud" value="AWS Cloud" style="shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none;verticalAlign=top;verticalLabelPosition=bottom;align=center;" vertex="1" parent="1">
          <mxGeometry x="60" y="100" width="760" height="260" as="geometry" />
        </mxCell>${icon('c1', 120, 'cloudfront', 'CloudFront')}${icon('c2', 340, 'api_gateway', 'API Gateway')}${icon('c3', 560, 'lambda', 'Lambda')}${icon('c4', 780, 'dynamodb', 'DynamoDB')}${edge('e1', 'c1', 'c2')}${edge('e2', 'c2', 'c3')}${edge('e3', 'c3', 'c4', 'dashed=1;')}${edge('e4', 'c3', 'c1', 'dashed=1;strokeColor=#DD344C;')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

const out = '/output/aws-sample.drawio';
fs.writeFileSync(out, xml);
console.log(`sample written: ${out} (${xml.length} chars)`);

// ---- 3. static verification ----
const failures = [];
// (a) every resIcon name is in the catalogs
for (const m of xml.matchAll(/resIcon=mxgraph\.aws4\.([a-z0-9_]+)/g)) {
  if (!known.has(m[1])) failures.push(`UNKNOWN stencil: ${m[1]}`);
}
// (b) every service-level icon carries strokeColor=#ffffff
const serviceCells = xml.match(/style="sketch=0;outlineConnect=0;[^"]*shape=mxgraph\.aws4\.resourceIcon[^"]*"/g) ?? [];
for (const s of serviceCells) {
  if (!s.includes('strokeColor=#ffffff')) failures.push('service icon missing strokeColor=#ffffff');
}
// (c) every edge has relative="1"
const edgeCells = xml.match(/edge="1"[^>]*>/g) ?? [];
for (const e of edgeCells) {
  if (!xml.slice(xml.indexOf(e)).slice(0, 400).includes('relative="1"')) failures.push('edge missing relative="1" geometry');
}
// (d) no XML comments
if (/<!--/.test(xml)) failures.push('XML comment present');
// (e) root cells exist
if (!/id="0"/.test(xml) || !/id="1"/.test(xml)) failures.push('missing root cells');

console.log(failures.length === 0 ? 'VERIFY: PASS — all stencil names, stroke rules, edges, and structure check out' : `VERIFY: FAIL\n- ${failures.join('\n- ')}`);
process.exit(failures.length === 0 ? 0 : 1);
