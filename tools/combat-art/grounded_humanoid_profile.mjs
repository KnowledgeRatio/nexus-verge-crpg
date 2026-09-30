/** Shared offline requests and runtime metadata for the traveller-compatible rigs. */
const omitted = new Set(['hit', 'death', 'getUp', 'groundGetUp']);
export function groundedHumanoidRequests(motion) {
    const sources = new Set();
    for (const [key, action] of Object.entries(motion.actions)) {
        if (omitted.has(key)) { continue; }
        sources.add(action.clip);
        for (const clip of Object.values(action.handClips || {})) { sources.add(clip); }
    }
    const requests = [...sources].map(source => ({ name: `Ground_${source}`, source }));
    for (const source of new Set([...Object.values(motion.idles || {}),
        ...Object.values(motion.offHandIdles || {})].map(entry => entry.clip))) {
        requests.push({ name: `Ground_${source}`, source, hold: .2, duration: .5 });
    }
    return requests;
}

export function groundedHumanoidProfile(motion) {
    const actions = {};
    for (const [key, action] of Object.entries(motion.actions)) {
        if (omitted.has(key)) { continue; }
        actions[key] = { clip: `Ground_${action.clip}`, preservePose: true };
        if (action.handClips) {
            actions[key].handClips = Object.fromEntries(Object.entries(action.handClips)
                .map(([hand, clip]) => [hand, `Ground_${clip}`]));
        }
    }
    actions.death = { clip: 'Ground_Death', hold: true, preservePose: true, supportGrip: false };
    const held = entries => Object.fromEntries(Object.entries(entries || {})
        .map(([key, entry]) => [key, { clip: `Ground_${entry.clip}`, poseTime: 0 }]));
    return { ...motion,
        actions: { ...motion.actions, groundGetUp: { clip: 'Ground_GetUp', preservePose: true, supportGrip: false } },
        conditions: { ...motion.conditions, prone: {
            clip: 'Ground_Idle', poseTime: 0, exit: 'groundGetUp', reactions: { hit: false }, aimWeapons: true,
            actions, idles: held(motion.idles), offHandIdles: held(motion.offHandIdles),
            weaponMounts: { bow: { rotation: [0, 0, Math.PI / 2] } }
        } }
    };
}
