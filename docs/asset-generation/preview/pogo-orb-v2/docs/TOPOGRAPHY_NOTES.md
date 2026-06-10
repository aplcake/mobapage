# Pogo Orb V2 Topography Notes

## Terrain Contract

Topography in the long-approach control room is authored as gameplay height first, visual mesh second.

- `world/longApproachLevel.ts` owns walkable terrain height through `getTerrainHeight(x, z)`.
- `render/LongApproachArena.tsx` renders that height once through `SolidTerrainGround`.
- Paths, dots, water, and markers are overlays only. They should not create the hill shape.
- Do not stack large flat grass panes to fake elevation. Thin panes create low-camera gaps, depth ordering artifacts, and floating-building reads.
- Curved paths and grade bands should be continuous terrain-following ribbons. Avoid separate large discs/strips at path nodes on slopes.
- Elevated walkable areas need local underside mass. A broad hill should have a sampled visual fill/skirt under the playable surface so low camera angles never reveal sky or a hollow paper edge.
- Hill approaches need soft shoulders, not hard side cliffs. If a side path can reach the hill, the height function should slope broadly enough that side entry feels like walking onto a mound, not stepping through a crack.

## Why The Hill Broke

The previous hill mixed three competing systems:

- a curved terrain sheet with no thickness
- a large flat backing plane below it
- a rectangular museum foundation box placed into the hill

From low angles the terrain sheet had no side mass, while the overlays and foundation rendered at mismatched heights. That made the hill look transparent or sliced into panes.

## Future Method

For new topography:

1. Add or adjust a named height function in `longApproachLevel.ts`.
2. Keep it broad and smooth enough for the player controller to sample.
3. Let `SolidTerrainGround` render the whole surface and skirt edges down to a base.
4. Place props with `terrainY(x, z)` so they follow the ground.
5. Add collision only when the visual form clearly says it is solid or walkable.
6. Use subtle contour/shoulder bands to reveal slope direction when a hill is broad and smooth.
7. For any hill that rises far above base ground, add a matching underside fill region with side skirts before adding props. This is visual grounding, not a second physics surface.
8. Controller grounding should distinguish continuous terrain from discrete platforms. Terrain can be followed downhill smoothly; platforms and steps can still have real ledges.

If a terrain feature needs a hard cliff, build it as a dedicated solid landmark or platform with matching collision. Do not rely on a transparent plane edge to imply mass.
