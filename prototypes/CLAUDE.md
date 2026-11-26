# Working on the prototypes (iPad and iPhone)

These rules apply to any change in `prototypes/`, for either device.

- Edit only `source/` (`takenote.html` for both devices, `devices/<device>.css|.js|devices.json` for one). Never edit `shared/`, `ipad-home/` or `iphone-home/` by hand, except their `.md` files.
- After every change, run `python3 tools/build.py` from `prototypes/`. It regenerates both device builds and resyncs their sizes (`barScale`, `iconScale` in `devices.json`).
- A feature added or changed for one device must be checked on the other. Run both suites: `npm test` runs `tests/ipad.spec.mjs` and `tests/iphone.spec.mjs`. Add or update a test in each when behaviour changes.
- `python3 tools/build.py --check` must pass before committing.
- Commit the source and the regenerated files together, then push to the working branch. `prototype-sync.yml` regenerates and commits them on GitHub if a push forgets, and `prototype-pages.yml` fails a pull request whose builds are stale.
- Apple emoji artwork is never committed. `--standalone` output with `--emoji-js` stays outside the repository.
