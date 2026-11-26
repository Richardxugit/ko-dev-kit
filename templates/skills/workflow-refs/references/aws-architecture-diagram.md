# AWS Architecture Diagram Playbook (draw.io)

Generate `diagrams/aws.drawio` for AWS designs using the official AWS4 icon set (draw.io's built-in `mxgraph.aws4` stencil library — the official AWS Architecture Icons, updated quarterly). Read this file fully before generating; look up every icon name in `aws-diagram/icons/` — never guess.

## When

- The design deploys to or integrates with AWS resources (Lambda, ECS, RDS, S3, SQS, ...).
- Skip for non-AWS or pure-frontend designs (per the output contract).

## Output

- One file: `diagrams/aws.drawio` — native XML, editable in draw.io, version-controllable.
- Complex designs: multiple pages (tabs) in one file — `<diagram id="overview" name="Overview">` plus `<diagram id="..." name="...">` detail pages.

## Layout

- Left-to-right data flow. UI/frontend LEFT; data sources / external systems RIGHT.
- Horizontal lanes for parallel paths.
- Minimum 220px horizontal spacing between icons (room for edge labels), 250px vertical between lanes.
- Secondary/auxiliary services (monitoring, DLQ, error paths) BELOW the main flow with 280px+ gap.
- Canvas minimum `pageWidth="2400" pageHeight="1400"`, viewport `dx="2800" dy="1600"`.
- Title block as the first element after the root cells:
  `<mxCell value="&lt;b&gt;Diagram Title&lt;/b&gt;&lt;br&gt;Author | Date | Version" style="text;html=1;align=left;verticalAlign=top;whiteSpace=wrap;rounded=0;fontSize=14;spacing=8;" vertex="1" parent="1">` with `<mxGeometry x="40" y="30" width="420" height="60" as="geometry" />`.

## Icon patterns — the #1 failure point

Two patterns with OPPOSITE `strokeColor` rules:

| Pattern | style | strokeColor | size |
|---|---|---|---|
| Service-level (colored square + white glyph) | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.<name>` | `#ffffff` REQUIRED | 78x78 |
| Resource-level (standalone silhouette) | `shape=mxgraph.aws4.<name>` | `none` REQUIRED | 48x48 or 78x78 |

Confusing them guarantees broken icons: a service-level icon without `strokeColor=#ffffff` loses its white glyph; a resource-level icon with `#ffffff` renders wrong. Use `sketch=0` and 12px labels throughout.

Look up every icon in `aws-diagram/icons/aws-icons-<category>.md` (compute, database, integration, networking, storage, security, analytics-ml, common, iot-migration-devtools). Stencil names do NOT always match current AWS service names — OpenSearch is still `elasticsearch_service`. Verify, never guess; an empty box means a wrong stencil name.

## Edges

Base style for all edges: `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=2;`

- Solid black (`strokeWidth=2`): primary data flow.
- Dashed black (`dashed=1`): optional/async path.
- Dashed red (`strokeColor=#DD344C;dashed=1`): error path.
- Labels SHORT (1–2 words max), always with `labelBackgroundColor=#F5F5F5;` so text never overlaps lines. Omit `value` entirely for unlabeled edges.
- Edges to services above/below the main flow get explicit exit/entry points (exit bottom `exitX=0.5;exitY=1`, enter top `entryX=0.5;entryY=0`, etc.) so draw.io never routes lines through icons.
- Every edge carries `<mxGeometry relative="1" as="geometry" />`.

## Groups

- AWS Cloud: `shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none`
- Account: `grIcon=mxgraph.aws4.group_account;strokeColor=#CD2264`; On-premise: `grIcon=mxgraph.aws4.group_on_premise;strokeColor=#5A6C86`.
- Logical groups: dashed box `whiteSpace=wrap;html=1;fillColor=none;dashed=1;dashPattern=8 8`.
- NO colored backgrounds on group boxes — always `fillColor=none`.

## XML well-formedness

- NEVER include XML comments (`<!-- -->`) — they cause parse errors.
- Escape special characters: `&amp;` `&lt;` `&gt;` `&quot;`.
- Unique `id` per mxCell; the file must include root cells `id="0"` and `id="1"` (`parent="0"`).
- PNG export background fix: place a full-canvas rectangle as the FIRST element (lowest z-order): `style="rounded=0;whiteSpace=wrap;html=1;fillColor=#F5F5F5;strokeColor=none;"` with full-canvas `mxGeometry`. Prevents black background on PNG export. Use `strokeColor=none`, not a grey hex.

## Validation (before calling it done)

1. Every `resIcon=` / `shape=` value exists in the icon catalogs.
2. Service-level icons have `strokeColor=#ffffff`; resource-level have `strokeColor=none`.
3. No comments, unique ids, every edge has `relative="1"` geometry.
4. The diagram agrees with the prose, `aws.mmd`, and `file:line` evidence.

## Rendering

- Draw.io CLI: `drawio -x -f png -e -b 10 -o aws.drawio.png aws.drawio` (`-e` embeds the XML so the exported PNG stays editable); macOS path: `/Applications/draw.io.app/Contents/MacOS/draw.io` with the same flags. Exported files use the double extension `aws.drawio.png`.
- Claim "rendered" only after a real renderer run. Otherwise report XML generation plus static checks only (matches the output contract).

## Structure references

- Complete verified file structure (header → cells → edges → close): `aws-diagram/templates/*.drawio` — study one matching template before writing from scratch.
- Icon catalogs: `aws-diagram/icons/aws-icons-*.md` — load by category as needed.

## Sources

Icon catalogs and layout conventions derived from vidanov/aws-architecture-diagram-skill (MIT); stencil names are draw.io's built-in AWS4 library data.
