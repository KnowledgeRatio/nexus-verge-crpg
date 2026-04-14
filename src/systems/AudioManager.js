/**
 * AudioManager.js
 * Handles all game audio playback with proper pooling and volume management
 * Supports combat sounds, exploration sounds, ambient audio, and future extensibility
 */

class AudioManager {
    constructor() {
        this.enabled = true;
        this.masterVolume = 0.5; // Master volume (0.0 to 1.0)
        this.sfxVolume = 1.0; // Sound effects volume multiplier
        this.musicVolume = 0.7; // Music/ambient volume multiplier
        this.sounds = {};
        this.music = {};
        this.currentMusic = null;
        this.audioContext = null;

        // Initialize Web Audio API for better performance
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported, falling back to HTML5 Audio');
        }

        // Load all sound effects and music
        this.loadSounds();
        this.loadMusic();
    }

    /**
     * Load all sound effect files
     */
    loadSounds() {
        const soundFiles = {
            // === COMBAT SOUNDS ===
            // Melee weapon sounds
            meleeCritical: 'data/sound/sword-impact-hit-2.wav',
            meleeHit: 'data/sound/sword-impact-hit-3.wav',
            meleeMiss: 'data/sound/sword-attack-1.wav',

            // Ranged weapon sounds
            rangedCritical: 'data/sound/spell-impact-2.wav',
            rangedHit: 'data/sound/spell-impact-1.wav',
            rangedMiss: 'data/sound/bow-blocked-1.wav',

            // Healing/ability sounds
            heal: 'data/sound/ice-freeze-1.wav',

            // Death/defeat sound (plays 1 second after fatal damage)
            death: 'data/sound/light-torch-2.wav',

            // === EXPLORATION SOUNDS ===
            // Footstep sounds (dirt/terrain)
            footstep1: 'data/sound/dirt-run-1.wav',
            footstep2: 'data/sound/dirt-run-2.wav',
            footstep3: 'data/sound/dirt-run-3.wav',
            footstep4: 'data/sound/dirt-run-4.wav',
            footstep5: 'data/sound/dirt-run-5.wav'

            // === EXPLORATION SOUNDS (placeholders for future) ===
            // doorOpen: 'data/sound/door_open.wav',
            // doorClose: 'data/sound/door_close.wav',
            // itemPickup: 'data/sound/item_pickup.wav',
            // gold: 'data/sound/gold.wav',
            // levelUp: 'data/sound/level_up.wav',
            // questComplete: 'data/sound/quest_complete.wav',
            // menuOpen: 'data/sound/menu_open.wav',
            // menuClose: 'data/sound/menu_close.wav',
            // buttonClick: 'data/sound/button_click.wav',
            // notificationPing: 'data/sound/notification.wav',

            // === UI SOUNDS (placeholders for future) ===
            // uiHover: 'data/sound/ui_hover.wav',
            // uiSelect: 'data/sound/ui_select.wav',
            // uiError: 'data/sound/ui_error.wav',

            // === TERRAIN SOUNDS (placeholders for future) ===
            // grassStep: 'data/sound/grass_step.wav',
            // waterSplash: 'data/sound/water_splash.wav',
            // rockStep: 'data/sound/rock_step.wav',
            // snowCrunch: 'data/sound/snow_crunch.wav'
        };

        // Preload all sounds with audio pooling
        for (const [key, path] of Object.entries(soundFiles)) {
            this.sounds[key] = {
                path: path,
                audio: new Audio(path),
                pool: [], // Audio pool for overlapping sounds
                category: 'sfx' // All sounds are sound effects
            };

            // Preload the audio
            this.sounds[key].audio.preload = 'auto';
            this.sounds[key].audio.volume = this.masterVolume * this.sfxVolume;

            // Create audio pool (3 instances per sound for overlapping)
            for (let i = 0; i < 3; i++) {
                const poolAudio = new Audio(path);
                poolAudio.preload = 'auto';
                poolAudio.volume = this.masterVolume * this.sfxVolume;
                this.sounds[key].pool.push(poolAudio);
            }
        }
    }

    /**
     * Load music/ambient tracks
     */
    loadMusic() {
        const musicFiles = {
            // === AMBIENT MUSIC (placeholders for future) ===
            // explorationCalm: 'data/music/exploration_calm.mp3',
            // explorationTense: 'data/music/exploration_tense.mp3',
            // combatIntense: 'data/music/combat_intense.mp3',
            // townPeaceful: 'data/music/town_peaceful.mp3',
            // dungeonOminous: 'data/music/dungeon_ominous.mp3',
            // victoryFanfare: 'data/music/victory_fanfare.mp3',
            // defeatSombre: 'data/music/defeat_sombre.mp3'
        };

        // Preload music tracks (no pooling needed - only one at a time)
        for (const [key, path] of Object.entries(musicFiles)) {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.volume = this.masterVolume * this.musicVolume;
            audio.loop = true; // Music loops by default

            this.music[key] = {
                path: path,
                audio: audio,
                category: 'music'
            };
        }
    }

    /**
     * Play a sound effect
     * @param {string} soundKey - Key of the sound to play
     * @param {number} volumeMultiplier - Optional volume multiplier (0.0 to 1.0)
     */
    play(soundKey, volumeMultiplier = 1.0) {
        if (!this.enabled || !this.sounds[soundKey]) {
            return;
        }

        // Find an available audio instance from the pool
        const sound = this.sounds[soundKey];
        let audioToPlay = sound.pool.find(audio => audio.paused || audio.ended);

        // If all instances are playing, use the first one (interrupt)
        if (!audioToPlay) {
            audioToPlay = sound.pool[0];
        }

        // Set volume and play (ensure finite value)
        const targetVolume = Math.max(0, Math.min(1, this.masterVolume * this.sfxVolume * volumeMultiplier));
        audioToPlay.volume = targetVolume;
        audioToPlay.currentTime = 0; // Reset to start

        audioToPlay.play().catch(err => {
            console.warn(`Failed to play sound ${soundKey}:`, err);
        });
    }

    /**
     * Play combat sound based on attack result
     * @param {Object} result - Combat result object
     */
    playCombatSound(result) {
        const { weaponType, hit, critical, healing } = result;

        // Healing sound
        if (healing) {
            this.play('heal', 0.8);
            return;
        }

        // Determine weapon type (melee or ranged)
        const isRanged = weaponType === 'ranged';

        if (hit) {
            if (critical) {
                // Critical hit
                this.play(isRanged ? 'rangedCritical' : 'meleeCritical', 1.0);
            } else {
                // Regular hit
                this.play(isRanged ? 'rangedHit' : 'meleeHit', 0.9);
            }
        } else {
            // Miss (includes critical miss)
            this.play(isRanged ? 'rangedMiss' : 'meleeMiss', 0.7);
        }
    }

    /**
     * Play healing sound
     */
    playHealSound() {
        this.play('heal', 0.8);
    }

    /**
     * Play random footstep sound
     * @param {number} volumeMultiplier - Optional volume multiplier (default: 0.3 for subtle footsteps)
     */
    playFootstepSound(volumeMultiplier = 0.3) {
        // Pick random footstep sound (1-5)
        const randomIndex = Math.floor(Math.random() * 5) + 1;
        const soundKey = `footstep${randomIndex}`;
        this.play(soundKey, volumeMultiplier);
    }

    /**
     * Play background music
     * @param {string} musicKey - Key of the music track to play
     * @param {boolean} loop - Whether to loop the music (default: true)
     * @param {number} fadeInDuration - Fade in duration in milliseconds (default: 1000)
     */
    playMusic(musicKey, loop = true, fadeInDuration = 1000) {
        if (!this.enabled || !this.music[musicKey]) {
            return;
        }

        // Stop current music if playing
        if (this.currentMusic) {
            this.stopMusic(fadeInDuration);
        }

        const track = this.music[musicKey];
        track.audio.loop = loop;
        track.audio.volume = 0; // Start at 0 for fade in
        track.audio.currentTime = 0;

        track.audio.play().catch(err => {
            console.warn(`Failed to play music ${musicKey}:`, err);
        });

        // Fade in
        this.fadeAudio(track.audio, 0, this.masterVolume * this.musicVolume, fadeInDuration);
        this.currentMusic = track;
    }

    /**
     * Stop current music
     * @param {number} fadeOutDuration - Fade out duration in milliseconds (default: 1000)
     */
    stopMusic(fadeOutDuration = 1000) {
        if (!this.currentMusic) {
            return;
        }

        const track = this.currentMusic;
        this.fadeAudio(track.audio, track.audio.volume, 0, fadeOutDuration, () => {
            track.audio.pause();
            track.audio.currentTime = 0;
        });

        this.currentMusic = null;
    }

    /**
     * Fade audio volume
     * @param {HTMLAudioElement} audio - Audio element to fade
     * @param {number} startVolume - Starting volume
     * @param {number} endVolume - Target volume
     * @param {number} duration - Duration in milliseconds
     * @param {Function} callback - Optional callback when fade completes
     */
    fadeAudio(audio, startVolume, endVolume, duration, callback = null) {
        const steps = 50; // Number of volume steps
        const stepDuration = duration / steps;
        const volumeStep = (endVolume - startVolume) / steps;
        let currentStep = 0;

        const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = Math.max(0, Math.min(1, startVolume + (volumeStep * currentStep)));

            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                if (callback) {
                    callback();
                }
            }
        }, stepDuration);
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * Set sound effects volume
     * @param {number} volume - Volume multiplier (0.0 to 1.0)
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * Set music volume
     * @param {number} volume - Volume multiplier (0.0 to 1.0)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * Update volumes for all audio instances
     */
    updateAllVolumes() {
        // Update sound effects
        for (const sound of Object.values(this.sounds)) {
            const targetVolume = this.masterVolume * this.sfxVolume;
            sound.audio.volume = targetVolume;
            sound.pool.forEach(audio => {
                audio.volume = targetVolume;
            });
        }

        // Update music
        for (const track of Object.values(this.music)) {
            track.audio.volume = this.masterVolume * this.musicVolume;
        }
    }

    /**
     * Toggle audio on/off
     * @param {boolean} enabled - Whether audio should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;

        // Stop all currently playing sounds if disabling
        if (!enabled) {
            this.stopAll();
        }
    }

    /**
     * Stop all playing sounds and music
     */
    stopAll() {
        // Stop sound effects
        for (const sound of Object.values(this.sounds)) {
            sound.audio.pause();
            sound.audio.currentTime = 0;
            sound.pool.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        }

        // Stop music
        this.stopMusic(0); // Immediate stop
    }

    /**
     * Get master volume
     * @returns {number} Master volume (0.0 to 1.0)
     */
    getMasterVolume() {
        return this.masterVolume;
    }

    /**
     * Get sound effects volume
     * @returns {number} SFX volume multiplier (0.0 to 1.0)
     */
    getSFXVolume() {
        return this.sfxVolume;
    }

    /**
     * Get music volume
     * @returns {number} Music volume multiplier (0.0 to 1.0)
     */
    getMusicVolume() {
        return this.musicVolume;
    }

    /**
     * Check if audio is enabled
     * @returns {boolean} Whether audio is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Register a new sound effect dynamically
     * @param {string} key - Sound key
     * @param {string} path - Path to audio file
     * @param {string} category - Category (sfx/music)
     */
    registerSound(key, path, category = 'sfx') {
        if (this.sounds[key]) {
            console.warn(`Sound ${key} already registered`);
            return;
        }

        this.sounds[key] = {
            path: path,
            audio: new Audio(path),
            pool: [],
            category: category
        };

        this.sounds[key].audio.preload = 'auto';
        this.sounds[key].audio.volume = this.masterVolume * this.sfxVolume;

        // Create audio pool
        for (let i = 0; i < 3; i++) {
            const poolAudio = new Audio(path);
            poolAudio.preload = 'auto';
            poolAudio.volume = this.masterVolume * this.sfxVolume;
            this.sounds[key].pool.push(poolAudio);
        }
    }
}

// Export singleton instance
const audioManager = new AudioManager();
export default audioManager;
