# Wight first-pass integration

The canonical Wight now selects `wight-v1.glb` in combat. The model derives from
the original upright traveller, preserving its shared sword, bow, walk, reaction,
prone and defeat animations. Pale skin, original frost-coloured eyes and skinned
iron-mail rings distinguish it from the hunched Zombie. The gambeson silhouette
still uses the traveller coat; this is a reusable first pass, not final creature art.

`build_wight.mjs` builds the asset locally without a new dependency or downloaded
art. Indexed, simplified mail reduces the initial 13 MB experiment to about
2.6 MB. The existing texture and animation provenance remains in the asset
attributions.

## Review

At `http://127.0.0.1:8765/combat-study.html`, select **Wight — sword and Life Drain**
or **Wight — longbow and Life Drain**. The creature-action selector reads the
canonical Sword, Longbow and Life Drain actions from `data/monsters.json`.

Sword and Longbow use the established weapon presentations. Life Drain uses an
empty-hand reaching gesture and the existing close-range drain profile. It is a
gesture presentation, not a calibrated palm-on-body touch or a new drain VFX.
Changing back to the weapon attack restores the appropriate sword or bow.
Description-only maximum-HP reduction has not been implemented by this art work.

## Evidence

- Browser checked both scenarios at 1280 × 900 without page errors.
- Uninterrupted playback verified sword → empty-hand drain → sword, and
  bow → empty-hand drain → bow, including the rendered actor's weapon model.
- `live-wightSword.png` and `live-wightBow.png` show the two equipment setups.
- Asset tests exercise real GLB motion bounds, armour materials and drain timing;
  presentation tests admit canonical equipment and resolve all canonical actions.

Full monster coverage and final visual acceptance remain outstanding.
