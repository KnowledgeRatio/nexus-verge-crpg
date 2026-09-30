# Three.js 0.180.0

Unmodified `build/three.module.min.js`, `build/three.core.min.js` and `LICENSE`
from the npm package `three@0.180.0` (MIT).

Source: https://github.com/mrdoob/three.js/tree/r180

The optional combat visual study loads these local files dynamically. They are
vendored because the application deploys as static files without a build step;
there is no runtime CDN dependency. These are runtime dependencies outside the
npm dependency tree, so the npm-only SBOM does not enumerate them.

Reproduce by downloading `npm pack three@0.180.0` and extracting only the above
files. Package tarball SHA-1: `b930cabfb524f6d36bf63e874b4d866888b50487`.

The authored combat assets also use `examples/jsm/loaders/GLTFLoader.js` and
`examples/jsm/utils/BufferGeometryUtils.js` from the same package, retained under
`addons/`. Their only change is rewriting the bare `from 'three'` import to
`from '../../three.module.min.js'` for this static deployment. Preserve that
relative import when updating the vendored version.
