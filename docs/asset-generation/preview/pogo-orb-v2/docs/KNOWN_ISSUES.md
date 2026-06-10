# Known Issues

## Build And Browser Warnings

```txt
Vite reports chunks larger than 500 kB after minification.
THREE.Clock is deprecated and should eventually move to THREE.Timer.
WebGL ReadPixels performance warnings appear during browser smoke tests.
```

These warnings are known and did not block Package 12 validation.

## Visual Polish

```txt
The level remains a styled blockout, not final art.
Terrain is still chunky box/topography based.
Props are code-native stand-ins.
Quest objects use simple readable geometry.
Scatter placement is deterministic but not deeply art-directed.
```

## Gameplay Scope

```txt
Museum seal remains a locked prompt.
Glowbud Wizard interaction only grants a debug quest flag.
No dialogue tree is implemented.
No inventory UI is implemented beyond debug counts.
No win state, fail state, timer, economy, upgrades, or completion pressure is implemented.
```

## QA Risks To Recheck In Future Passes

```txt
Manual controller feel on the full cave branch climb.
Camera comfort when moving quickly between overlapping zones.
Visual overlap between decorative props and debug surfaces.
Chunk size if this preview grows further.
Final style pass after debug overlays are disabled.
```
