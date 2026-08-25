# Supplied Kortex brain audit

Source: `source/Brain.fbx` (FBX 7.4 binary, 11.3 MB), exported from Blender 3.3.

## Before optimization

- 2 mesh regions, both named `Icosphere.10807`
- 400,000 triangles / 480,000 FBX vertices (1.2M naive render vertices before welding)
- 2 materials: `Particle_1`, `Particle_2`
- normals and tangents present; UV0 present; no textures
- no bones, cameras, lights, or embedded textures
- shallow hierarchy: `RootNode -> Icosphere.001`
- bounds: `(-51.46, -47.94, -63.47)` to `(57.12, 62.04, 66.36)`
- source node has a baked ~100x scale and rotation; runtime code normalizes visual scale/orientation
- an animation container exists in FBX but contains no runtime animation clips

The two meshes have distinct materials and were retained. Duplicate per-face vertices were welded; unused UV/tangent streams were removed because the source has no textures. Geometry was simplified with a bounded meshoptimizer error rather than replaced or remeshed.

## Runtime outputs

- `assets/models/kortex-brain.glb`: 180,000 triangles, 110,000 uploaded vertices, 2.7 MB
- `assets/models/kortex-brain-low.glb`: approximately 88,000 triangles, 1.5 MB

Both use standard glTF 2.0 with quantized positions/normals and preserve the two source materials. The original FBX and archive remain untouched. The high LOD loads asynchronously; the capture control remains available while it loads. Reduced Motion disables continuous movement and uses restrained state transitions.
