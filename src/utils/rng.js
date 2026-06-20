/**
 * Mulberry32 Seeded Pseudo-Random Number Generator
 * Fast, high-quality PRNG with seedable output
 * Returns values in range [0, 1)
 */

export function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Hash a string to a 32-bit integer seed
 * @param {string} str - String to hash
 * @returns {number} - 32-bit integer seed
 */
export function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Generate a random seed string in format: WORD-NNNN-WORD
 * @returns {string} - Random seed string
 */
export function generateSeedString() {
    const words = [
        'NEXUS', 'SHADOW', 'LIGHT', 'DRAGON', 'STORM', 'IRON', 'FROST',
        'FLAME', 'STONE', 'SILVER', 'GOLD', 'DARK', 'STAR', 'MOON',
        'SUN', 'VOID', 'CHAOS', 'ORDER', 'ARCANE', 'MYSTIC', 'ANCIENT',
        'ETERNAL', 'PHANTOM', 'CRYSTAL', 'BLOOD', 'SOUL', 'RUNE', 'FATE'
    ];

    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `${word1}-${number}-${word2}`;
}

/**
 * Create a seeded RNG from a string seed
 * @param {string} seedString - Seed string
 * @returns {function} - RNG function
 */
export function createSeededRNG(seedString) {
    const seed = hashString(seedString);
    return mulberry32(seed);
}

/**
 * Alias for createSeededRNG for backwards compatibility
 */
export function createRNG(seed) {
    if (typeof seed === 'string') {
        return createSeededRNG(seed);
    }
    // If seed is already a number, use it directly
    return mulberry32(seed);
}

/**
 * Convert seed string to number
 */
export function seedToNumber(seedString) {
    return hashString(seedString);
}

/**
 * RNG utility class with convenience methods
 */
export class SeededRandom {
    constructor(seedString) {
        this.seedString = seedString;
        this.seed = hashString(seedString);
        this.rng = mulberry32(this.seed);
    }

    /**
     * Get next random value [0, 1)
     */
    next() {
        return this.rng();
    }

    /**
     * Get random integer in range [min, max] inclusive
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Get random float in range [min, max)
     */
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    /**
     * Get random boolean with optional probability
     * @param {number} probability - Probability of true (0-1), default 0.5
     */
    nextBool(probability = 0.5) {
        return this.next() < probability;
    }

    /**
     * Select random element from array
     */
    choice(array) {
        if (!array || array.length === 0) {
            return null;
        }
        return array[Math.floor(this.next() * array.length)];
    }

    /**
     * Shuffle array (Fisher-Yates)
     */
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Select N unique random elements from array
     */
    sample(array, n) {
        if (n >= array.length) {
            return [...array];
        }
        const shuffled = this.shuffle(array);
        return shuffled.slice(0, n);
    }
}
