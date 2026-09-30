# Zombie presentation

The canonical zombie's `imageDescription` calls for a recognisable person in a
worn coat and belt, grey weathered skin, collapsed-forward posture and trailing
arms. `build_zombie.mjs` derives that first-pass body from the existing traveller:
a ragged split hem, subtly hollowed face, weathered materials and a reused rig.
It retains the existing surface textures and does not add graphic wounds.

`Zombie_Idle` and `Zombie_Walk` adapt the original motion library with a forward
spine and reduced arm motion. `Zombie_Slam` adapts the downward single-arm chop
with no held weapon. The canonical Slam is the only zombie attack; no new rules
or trait effects are implemented by this presentation. Ghouls/ghasts are not
admitted by this change: their claws and bites require different work.

Initial motion sampling found temporary lift in Slam and floor penetration in
inherited death/prone poses. The builder now samples active clips at 60 Hz and
authors a parent translation track to keep the body's lowest point near the
floor. Runtime animation code remains generic. This is presentation correction,
not a change to the engine's non-grid movement or action economy.

The study adds “Shambling zombies”, using canonical creature data and the
appearance-specific Slam profile. The main presentation registry also maps the
canonical zombie to the new asset. The retained humanoid rig supplies reactions,
death, prone and getting up. It is a first-pass derivative rather than a final
monster sculpt; clothing wear, face detail and exact impact contact remain
subject to visual refinement. Full campaign encounter/save acceptance is pending.

Validation: all 987 tests pass. Real GLB sampling covers idle, walk, Slam, hit,
death and prone; registry checks verify the canonical unarmed creature and model
preload. A live swamp study formed two zombie engagements and executed Slam
without browser errors (`live-zombies-encounter.png`). Builder/test lint is clean
and all 12 legal artifact checks pass. `zombie-poses.png` records the initial
pose review before the final floor correction; it is not the final floor audit.
