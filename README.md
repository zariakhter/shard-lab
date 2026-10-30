# The Shard Lab — Phase 2

A playable, browser-only ceramic nesting study. Open `index.html` in a modern browser; no installation, backend, API key, or build step is needed. Optional web fonts fall back to system fonts offline.

## Play

The library mixes broad fragments, long slivers, tapered wedges, scalene triangles, elongated triangles, and chipped triangular outlines. Three-sided shards use unequal proportions; chipped triangles retain triangular silhouettes with broken edges. Inventory thumbnails fit each outline without clipping long pieces. Hover over a shard for its shape family, area, and status.

The mold measures **400 × 300 mm**. The seeded inventory generates larger irregular fragments until their total area exceeds twice the bed area, then adds **35 small shards and 80 extra tiny shards** for residual pockets. Tiny shards use radii of 4–9 mm before irregularity. The exact count depends on the seed. The library scrolls and reports remaining material area.

1. Select a fragment, then click the mold to set its preview position; or drag from the library and release over the mold.
2. Green indicates a valid proposal; red indicates a boundary, overlap, or joint-clearance violation.
3. Rotate with the buttons or **R** (Shift+R reverses), in 15° steps. Arrow keys move 1 mm; Shift+arrows move 10 mm.
4. Click **Place fragment** or press **Enter** to commit. **Escape** or Cancel discards the preview.
5. Invalid commits remain visible and record the calculated reason in the journal. They never enter the panel.
6. Undo returns the last successful placement to inventory. Reset empties the panel while preserving shard geometry. Generate new study recreates the inventory from the entered seed and clears the panel and journal.

Clearance is adjustable from 3–8 mm on an empty panel. Once fragments are placed, reset or undo all placements to change it. Regenerating clears the current arrangement immediately. Reusing a seed reproduces the same geometry. The inventory cards show rounded bounding dimensions in millimeters; hover for actual polygon area in mm².

## Test the constraints

Try committing a fragment across the mold edge. Next, place a valid shard and move another over it. Finally, move the second shard just off the first: it remains invalid until the actual polygon edge distance reaches the required joint width. Red proposals and the conflicting placed shard stay visible until you move or cancel them. Boundary contact is permitted: joint clearance applies between ceramics, not between ceramic and mold.

Geometry is independent of the interface in `geometry.js`: segment intersections, point containment, minimum point-to-segment distances over every edge pair, rigid transforms, shoelace area, and rectangular containment. It supports simple concave polygons as well as convex ones. Touching ceramics are rejected. No bounding box is used as the final collision check. One drawing unit is one millimeter; canvas scaling converts those units to screen pixels.

Run automated tests with Node.js:

```
node geometry.test.js
```

## GitHub Pages

Upload this folder's files to a GitHub repository. In Settings → Pages, select **Deploy from a branch**, choose your branch and the root folder, then Save. Keep `index.html`, `style.css`, `geometry.js`, and `app.js` together. No build action is required.

## Automatic suggestions

Click **Suggest Next Move** to see a candidate preview. After 1.2 seconds, the same geometry engine used for manual placement accepts or rejects it. Rejections remain visible and appear in the journal with position, rotation, strategy, and the geometric reason. Click Suggest again to continue.

Choose **Best-fit** (default), **Largest-first**, or **Smallest-first**. The search aligns polygon edges with the mold and opposite edges of placed shards, offsets them by the required joint plus a 0.015 mm numerical margin, and derives continuous rotations directly from edge angles. It also tests endpoint/midpoint alignments, boundary contacts, and local position/rotation mutations. Manual rotation buttons retain 15° increments.

Best-fit compares remaining shapes by ceramic area and growth of the occupied envelope to favor dense packing. The other strategies prioritize area order, but try smaller alternatives if the preferred shard cannot fit. Actual polygon validation checks every candidate; bounding boxes only skip distant obstacles safely. Effort is a per-shard sampling budget. Browser search yields between shards to keep Pause responsive.

By default the best valid candidate is shown. Enable **Explore risky proposals** to sometimes submit a real failed candidate for inspection during single suggestions. Automatic runs prioritize valid packing and ignore this option. Rejection is never fabricated.

Automatic mode continues through smaller and tiny fragments rather than stopping at the first unsuccessful shard. If the initial edge search finds no placement, a rescue search measures free space on a **4 mm grid**, checks all remaining shards from smallest upward, and tests **24 rotations (15° steps)** at eligible centers. A successful rescue placement resumes normal proposals, and subsequent rescue passes fill further holes. Only after both searches fail across the remaining inventory does the run stop and explain its search resolution. This finite search cannot prove that no placement at any continuous position or angle exists. Required clearance is preserved for tiny shards too.

Run `node packing.test.js` for targeted tests of interior-pocket rescue, no-fit termination, and exhausted inventory.

The on-screen minimum achieved joint reports the actual closest polygon distance. A 3 mm mortar joint necessarily leaves uncovered space. Unrelated pottery fragments do not tessellate exactly; this greedy search does not guarantee the mathematical minimum gap or global maximum coverage. More inventory provides choices, rather than forcing every piece into the mold. Coverage depends on the inventory, clearance, strategy, and completed proposals; regression tests check both coverage and exact geometry.

**Run automatically** repeats preview and verdict steps. **Pause** stops search or pending placement and leaves any preview available for inspection or manual placement. Manual interaction, Undo, Reset, and regeneration interrupt pending automation. Automatic runs stop after both edge and rescue searches find no valid fit, or when no shards remain. Reset reproduces the search sequence for the current seed with unchanged strategy and effort.

Application integration checks can also be run with `node app.test.js`. These exercise initialization, delayed commitment, pause/reset timer cancellation, and safe placement sequences for all strategies using a simulated DOM. They do not replace visual browser testing.

## Scope

## Bake and filler preview

When automatic packing finishes, a persistent banner says **No more fits found — ready to bake**, or **All shards placed** if inventory is exhausted. The message describes the finite search; it does not claim a proof that every possible continuous arrangement was tested.

Click **Bake** after placing any shards. Automatic search pauses, the rejected/selected preview is removed, and filler pours into the bed over 2.8 seconds. It is drawn beneath the actual placed polygons, so only gaps and empty bed areas remain filled. Labels disappear for a clean mosaic preview. Pick warm limestone, ivory, terracotta, sage, dusty blue, charcoal, or any custom color. Colors update live during or after baking. **Bake again** replays the pour; **Back to arranging** removes the filler preview and preserves all placements. Reset, regeneration, or resumed arrangement/search cancels the finish animation. Empty panels cannot be baked.

This is a visual finish preview, not a simulation of material flow, curing, or firing.

This delivery implements **Phases 1–2**, plus an expanded inventory and improved geometric packing search. Comparative experiments, extended settings, and SVG/PNG/CSV/JSON exports are not included yet. The journal and score provide immediate study feedback. Data stays in browser memory and is cleared on reload.

This is a **2D geometric nesting simulation**, not a manufacturing or structural model. It does not predict shard curvature, thickness, fracture, suction-gripper performance, or mortar-panel durability.

