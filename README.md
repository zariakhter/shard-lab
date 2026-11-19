# The Shard Lab — Phase 2

A playable, browser-only ceramic nesting study. Open `index.html` in a modern browser; no installation, backend, API key, or build step is needed. Optional web fonts fall back to system fonts offline.

## Play

## Import real shards from photos

Click **Import photographed shards**. JPEG, PNG, and WebP photos (under 30 MB / 65 MP) are processed locally. Use separated pieces on a contrasting matte grid, with even lighting; put the camera directly above it. Keep the whole outline of every piece inside a visible reference rectangle on the mat.

1. Upload the photo. Click four known grid intersections around the pieces in this order: **top-left, top-right, bottom-right, bottom-left**.
2. Enter that rectangle's real width and height using the printed mat ruler, in inches or millimeters. Click **Calibrate mat**. Four-point planar perspective correction maps photo pixels to real millimeters. The app does not guess units or read ruler numerals automatically.
3. Click a clean part of the corrected mat between grid lines to sample its background, then **Detect pieces**. Adjust contrast, grid-line removal, or minimum area and detect again if necessary. The algorithm uses real pixel segmentation, morphological opening to remove thin grid lines, connected components, and concave boundary tracing; no convex hull replaces the measured outline.
4. Review each numbered polygon and its dimensions. Deselect unwanted detections. Cut-off shapes cannot be selected. Internal grid/texture warnings start unselected, but can be checked after verifying the outer edge. These measurements describe the outer silhouette; physical holes are not modeled or subtracted from area, and the record flags ignored internal regions. **Retrace** replaces a bad outline; **Trace new piece** lets you mark a missed piece. Click vertices in order and **Finish outline**; clicking the starting point again is accepted, while actual crossing outlines are rejected. The save hint explains whether pieces must be selected or the review confirmation is still missing.
5. Choose a destination under **Save to an existing library**, or click **+ Create a new library**, enter its name, and **Create and select**. This keeps the current photo, calibration, outlines, and review selections intact. Check the review confirmation, then click **Save**. Every photographed shard gets fixed millimeter geometry, width, height, area, perimeter, thumbnail, source photo ID/name, calibration corners and dimensions, homography, pixel scale, original-photo outline coordinates, method/settings, and timestamp. These same polygon dimensions drive collision and clearance checks on any bed size.

The original photo is kept in IndexedDB (`shard-lab-photos`) in this browser; library metadata and small cropped previews use local storage. Photos are not uploaded to GitHub or an AI service. Clearing site data removes these records; they do not sync to another device. **Export photo measurements (JSON)** downloads all photographed-shard measurements and calibration records, including cropped previews but not the full originals. Retain your original image files separately for a portable archive.

Measurements are estimates of a planar silhouette. Incorrect reference spans, camera lens distortion, uneven illumination, shadows, similar mat/shard colors, touching pieces, thickness and curved shards reduce accuracy. Four-point correction handles a planar angled photograph but does not correct lens distortion or parallax from raised pieces. This is not metrology or a fabrication guarantee. Minimum pixel resolution and polygon simplification also limit small-detail accuracy. Run `node photo-core.test.js` for calibration, pixel segmentation/grid removal, concavity, area/dimension, clipping, and manual-outline tests.

After saving, rows display **SAVED** with the piece ID and library name, and **View saved library** opens that library. Saved rows cannot be submitted twice from the same import. Clearing their checkboxes after a successful save does not remove them from the library.

## Shard libraries

The Original collection now includes a **large-shard batch equal in count to its seeded small/medium collection**. Its longest dimensions range from 6 to 20 inches (up to approximately 1 ft 8 in), with broad fragments, triangles, chipped triangles, and long slivers in ten colors. All sizes are fixed physical dimensions. Existing browser libraries receive this batch once, preserving custom pieces and photographed records; refresh does not add the batch again.

When the selected inventory has no unused physical pieces, automatic mode stops immediately, cancels further proposals, and shows a large **INVENTORY EMPTY** banner. Choose another library/All inventory, add pieces, Undo/Reset, or Bake. This is different from **No more fits found**, which means unused stock remains but no valid fit was found.

The initial shards belong to **Original collection**. Library tabs filter both the visible inventory and automatic proposals. **All inventory** combines all libraries; cards identify their source library. Switching tabs cancels pending search/preview but preserves every placed shard and checks collisions against the entire bed.

Each physical piece has a quantity of one on the current bed. Used cards show **0 remaining**. Repeated imports of the same source-photo region share stock across libraries, while original import records remain preserved. Source image SHA-256 hashes identify new uploads; older records use matching source IDs, or matching filenames/pixel dimensions and strongly overlapping original-photo outlines. Different positions in a photo remain different pieces. This does not identify the same physical object photographed again from a different viewpoint. All inventory searches the combined unused physical stock; fitting strategies may start with the largest photographed pieces before trying smaller generated pieces. The **Using** indicator shows the actual source scope. Both manual commitment and automatic proposals reject already-used stock, and switching tabs cancels stale proposals. Undo and Reset release the corresponding stock. Run `node stock.test.js` for identity and quantity tests.

Click **+ New library**, enter a name, and create it. Expand **Add pieces to a library** to choose a destination, polygon family, exact width and height in inches (0.125–24 in), and color, then click **+ Add this piece**. Width and height describe the unrotated polygon bounds. **+ Add 20 random pieces** creates a varied batch with independent fixed physical sizes. Piece IDs stay unique across libraries. Bed resizing preserves all libraries and physical dimensions.

Libraries, piece geometry, and the chosen tab are saved in this browser's local storage. They survive refresh on the same browser/site; arrangements still start empty after reload. Libraries do not sync between devices or browsers. A status message reports if browser storage is unavailable. **Generate new study** rebuilds the seeded original pieces while keeping manually added pieces and other libraries.

The outer mold frame now resizes to the entered width-to-height proportions using one shared display scale, without stretching the geometry. Grid lines are always **3 × 3 inches (76.2 × 76.2 mm)** apart in real dimensions. A 4 ft × 2 ft bed therefore has 16 columns and 8 rows; partial cells appear when a side is not a multiple of 3 inches. The drawing fits the available screen width and a 560 px display height.

Set **Bed dimensions** using separate feet and inches fields for width and height, then click **Apply bed size**. Inches may be decimal (for example, 6.5); whole feet plus inches are converted exactly using 25.4 mm per inch. Each side supports 3 inches–20 feet. Applying resets the current arrangement and preserves the existing library, including every polygon, assigned width/height, and area, while preserving the seed and joint clearance. The canvas changes aspect ratio and the heading shows feet and inches. Internal geometry stays in millimeters. For larger beds the rescue scan spacing scales to keep searches practical; the completion message reports the actual resolution.

The library mixes broad fragments, long slivers, tapered wedges, scalene triangles, elongated triangles, and chipped triangular outlines. Three-sided shards use unequal proportions; chipped triangles retain triangular silhouettes with broken edges. Inventory thumbnails fit each outline without clipping long pieces. Hover over a shard for its shape family, area, and status.

The mold initially measures **400 × 300 mm**. The seeded inventory generates larger irregular fragments until their total area exceeds a fixed 240,000 mm², then adds **35 small shards and 80 extra tiny shards** for residual pockets. Tiny shards use radii of 4–9 mm before irregularity. The exact count depends on the seed. Bed size does not affect shard size or the generated inventory. Each library card shows fixed unrotated width × height in inches and millimeters; rotation changes the orientation but never the physical geometry. Larger beds may exhaust this finite material supply before filling. The library scrolls and reports remaining material area.

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

After Bake finishes, **Manual placement guide** appears. **Save image with piece IDs (PNG)** downloads a high-resolution finished mosaic including the current filler color, all actual piece IDs, real bed dimensions, and a **TOP LEFT · START HERE** orientation marker. IDs match the library cards. Small or narrow pieces use outside labels with leader lines instead of unreadable overlapping text. **Save scalable guide (SVG)** supplies a vector version with placement coordinates and rotations in its metadata. The guide preserves the existing arrangement and library data. It is a visual reference, not an automatically 1:1 print template. Changing filler color updates the next download. Export controls hide while baking or after returning to arrangement mode. Run `node mosaic-guide.test.js` to check the labeled guide renderer.

When automatic packing finishes, a persistent banner says **No more fits found — ready to bake**, or **All shards placed** if inventory is exhausted. The message describes the finite search; it does not claim a proof that every possible continuous arrangement was tested.

Click **Bake** after placing any shards. Automatic search pauses, the rejected/selected preview is removed, and filler pours into the bed over 2.8 seconds. It is drawn beneath the actual placed polygons, so only gaps and empty bed areas remain filled. Labels disappear for a clean mosaic preview. Pick warm limestone, ivory, terracotta, sage, dusty blue, charcoal, or any custom color. Colors update live during or after baking. **Bake again** replays the pour; **Back to arranging** removes the filler preview and preserves all placements. Reset, regeneration, or resumed arrangement/search cancels the finish animation. Empty panels cannot be baked.

This is a visual finish preview, not a simulation of material flow, curing, or firing.

This delivery implements **Phases 1–2**, plus an expanded inventory and improved geometric packing search. Comparative experiments, extended settings, and SVG/PNG/CSV/JSON exports are not included yet. The journal and score provide immediate study feedback. Data stays in browser memory and is cleared on reload.

This is a **2D geometric nesting simulation**, not a manufacturing or structural model. It does not predict shard curvature, thickness, fracture, suction-gripper performance, or mortar-panel durability.



