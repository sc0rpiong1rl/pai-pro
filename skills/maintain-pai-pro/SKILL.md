---
name: maintain-pai-pro
description: Documents pai-pro's own repo-maintenance workflows — adding a new media-generation CLI, adding a new canvas node type, updating CLAUDE.md, and debugging the viewer/server/pty stack. Use when the user is editing the pai-pro repository itself (not running a filmmaking project session) — e.g. "add a new generation CLI", "add a node type to the canvas", "why is the viewer/pty/socket doing X", "update CLAUDE.md".
---

# Maintaining the pai-pro repo

This is for repo-maintenance tasks, not filmmaking project sessions. See the root `CLAUDE.md` for the operating manual; `server/canvas_mutator.js` and `server/canvas_schema.js` for the mutation/schema source of truth; `skills/CLAUDE.md` for skill-authoring rules.

## When adding a new media CLI

1. Add a new `pai_<x>_client.js` wrapping `callGenerate({ model: "<pai-raw-model>", payload, ... })` (sync) or `callSubmit + pollStatus` (async). Decode the upstream model's response shape and return `{ bytes, mime, model, durationSeconds, costUsd }` so the CLI is decode-agnostic. See `pai_image_client.js` for the sync template, `pai_video_client.js` for async.
2. Add `server/scripts/generate_<x>.js`. Mirror `generate_image.js`'s shape: import the new `pai_<x>_client.js`, plus `local_mirror.js` (`writeBytesToTmp` or `mirrorToTmp` for byte-vs-URL outputs, plus `viewerUrlForLocalPath` and `buildProviderRefs`), `_cli.js`, `_mutate_helper.js`; parse args; call the client; stage the output in `assets/.tmp/`; hand the absolute path to `postNodeAddBatch({ ..., tmpPath })` (or `postMutation({ op: "addBatch", payload: { nodes: [{ ..., tmp_path }] } })` for multi-node flows); compute the final URL/local_path from the assigned node id + extension; clean up the temp file if the mutation failed or was skipped; print one JSON line including `canvas_mutation`. On failure print `{ ok: false, klass, message }` and exit non-zero.
3. Add the model entry to `server/model_registry.js` and look up `getDefault(kind).id` in the CLI rather than hardcoding the string. Set `hidden: true` if the model is internal (not user-facing as a canvas card, e.g. the asset-upload row).
4. Add a row to the "Media CLIs" table in root `CLAUDE.md` (and update the Failure-handling table if the CLI surfaces a new class).
5. Add a skill `skills/<x>-compose/SKILL.md` per `skills/CLAUDE.md` rules. The recipe should pass `--ref-source-id` (byte refs) and `--source-node-id` (authorship edge) flags rather than asking the agent to write the node itself.
6. Add a row to the Skills-routing table at the top of root `CLAUDE.md`.

## When adding a new node type

1. Update `web/src/types/canvas.ts` (renderer source of truth). Add a React component to `web/src/pages/CanvasPage/nodes.tsx` and a `NODE_SIZES` entry in `web/src/pages/CanvasPage/nodeData.ts`.
2. Mirror the type into `server/canvas_schema.js`: add the data-validator (`#<type>Data`), the node-validator (`#<type>Node`), add it to `#canvasNode.oneOf`, and add a `NODE_ID_PREFIX` entry + `dataValidatorIdByType` entry in `server/canvas_mutator.js`.
3. Run `npm test` in `server/` — the `real <project>/workflow.json validates against doc schema` test catches drift.
4. Update the "Node grammar (what to put in payloads)" section in root `CLAUDE.md`. If a media CLI emits this type, update the relevant `<x>-compose` skill recipe.

## When changing CLAUDE.md

Keep the operating-manual half of root `CLAUDE.md` (everything above "## Maintaining this repo") lean. Push per-tool recipes and reference detail into the relevant skill; that file is the index. Update the Skills-routing table at the top whenever a skill is added or removed.

## Debugging

- Viewer / spawn / pty: `start.sh` runs the viewer; `stop.sh` tears it down. The viewer logs to its tmux pane.
- Per-project Claude sessions: JSONLs at `~/.claude/projects/<encoded-cwd>/` (encoding maps `/`, `_`, `.` to `-`). The viewer pulls the latest session id into `meta.claude_session_id` so resume-on-refresh works.
- CLI failures: every CLI prints `{ ok: false, klass, message }`. Replay with the same flags to reproduce.
- Browser ↔ viewer: DevTools → Network → WS frames. Canvas updates fan out as `canvas-state` (after every mutation); sidecar drag positions as `canvas-positions`; in-flight generation placeholders as `pending-generations`; title changes as `title`. The Home grid does NOT subscribe — it re-fetches on mount.
- Mutator audit: `projects/<id>/mutations.jsonl` is an append-only log of every applied mutation (ts, request_id, op, payload, reply). Useful for "who added this node and when".
