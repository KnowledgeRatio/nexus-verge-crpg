/**
 * Combat Renderer
 * Renders the tactical combat grid and combatants
 */

class CombatRenderer {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }

        this.ctx = this.canvas.getContext('2d');

        // Configuration
        this.config = {
            tileSize: config.tileSize || 40,
            font: config.font || '20px "Courier New", monospace',
            smallFont: config.smallFont || '12px "Courier New", monospace',
            ...config
        };

        // Colors
        this.colors = {
            gridLine: '#333333',
            gridBg: '#1a1a1a',
            playerTile: 'rgba(0, 120, 255, 0.2)',
            enemyTile: 'rgba(255, 50, 50, 0.2)',
            highlight: 'rgba(255, 255, 0, 0.3)',
            movement: 'rgba(0, 255, 0, 0.2)',
            player: '#00aaff',
            enemy: '#ff3333',
            text: '#ffffff'
        };

        console.log('⚔️ Combat Renderer initialized');
    }

    /**
     * Render combat scene
     */
    render(combatState) {
        if (!combatState || !combatState.active) {
            return;
        }

        const grid = combatState.grid;
        const combatants = combatState.combatants;

        // Calculate canvas size
        const canvasWidth = grid.width * this.config.tileSize;
        const canvasHeight = grid.height * this.config.tileSize;

        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;

        // Clear canvas
        this.clear();

        // Draw grid
        this.drawGrid(grid);

        // Draw combatants
        this.drawCombatants(combatants, grid);

        // Draw turn indicator
        this.drawTurnIndicator(combatState);
    }

    /**
     * Clear canvas
     */
    clear() {
        this.ctx.fillStyle = this.colors.gridBg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw grid
     */
    drawGrid(grid) {
        this.ctx.strokeStyle = this.colors.gridLine;
        this.ctx.lineWidth = 1;

        // Draw vertical lines
        for (let x = 0; x <= grid.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.config.tileSize, 0);
            this.ctx.lineTo(x * this.config.tileSize, grid.height * this.config.tileSize);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= grid.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.config.tileSize);
            this.ctx.lineTo(grid.width * this.config.tileSize, y * this.config.tileSize);
            this.ctx.stroke();
        }
    }

    /**
     * Draw combatants
     */
    drawCombatants(combatants, grid) {
        // Get positions from grid
        const positions = grid.positions || [];

        positions.forEach(pos => {
            const combatant = combatants.find(c => c.id === pos.id);
            if (!combatant) return;

            const x = pos.x * this.config.tileSize;
            const y = pos.y * this.config.tileSize;

            // Draw tile background
            this.ctx.fillStyle = combatant.team === 'player'
                ? this.colors.playerTile
                : this.colors.enemyTile;
            this.ctx.fillRect(x, y, this.config.tileSize, this.config.tileSize);

            // Draw combatant symbol
            const symbol = combatant.team === 'player' ? '@' : this.getEnemySymbol(combatant);
            const color = combatant.team === 'player' ? this.colors.player : this.colors.enemy;

            this.ctx.fillStyle = color;
            this.ctx.font = this.config.font;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                symbol,
                x + this.config.tileSize / 2,
                y + this.config.tileSize / 2
            );

            // Draw HP bar
            this.drawHPBar(combatant, x, y);

            // Draw name
            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = this.config.smallFont;
            this.ctx.fillText(
                combatant.name,
                x + this.config.tileSize / 2,
                y + this.config.tileSize - 5
            );
        });
    }

    /**
     * Get enemy symbol based on name/type
     */
    getEnemySymbol(combatant) {
        const name = combatant.name.toLowerCase();

        if (name.includes('goblin')) return 'g';
        if (name.includes('orc')) return 'o';
        if (name.includes('skeleton')) return 's';
        if (name.includes('zombie')) return 'z';
        if (name.includes('bandit')) return 'b';
        if (name.includes('wolf')) return 'w';
        if (name.includes('dragon')) return 'D';

        return 'E'; // Generic enemy
    }

    /**
     * Draw HP bar
     */
    drawHPBar(combatant, x, y) {
        const barWidth = this.config.tileSize - 10;
        const barHeight = 4;
        const barX = x + 5;
        const barY = y + 5;

        // Background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // HP
        const hpPercent = combatant.hp / combatant.maxHP;
        const hpColor = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffaa00' : '#ff0000';

        this.ctx.fillStyle = hpColor;
        this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // Border
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    /**
     * Draw turn indicator
     */
    drawTurnIndicator(combatState) {
        const currentCombatant = combatState.combatants.find(
            c => c.id === combatState.currentTurn
        );

        if (!currentCombatant) return;

        // Find position
        const pos = combatState.grid.positions.find(p => p.id === currentCombatant.id);
        if (!pos) return;

        // Draw arrow above current combatant
        const x = pos.x * this.config.tileSize + this.config.tileSize / 2;
        const y = pos.y * this.config.tileSize - 10;

        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = this.config.font;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('▼', x, y);
    }

    /**
     * Highlight tiles (for movement, attack range, etc.)
     */
    highlightTiles(tiles, color) {
        this.ctx.fillStyle = color || this.colors.highlight;

        tiles.forEach(tile => {
            const x = tile.x * this.config.tileSize;
            const y = tile.y * this.config.tileSize;
            this.ctx.fillRect(x, y, this.config.tileSize, this.config.tileSize);
        });
    }

    /**
     * Convert screen coordinates to grid coordinates
     */
    screenToGrid(screenX, screenY) {
        return {
            x: Math.floor(screenX / this.config.tileSize),
            y: Math.floor(screenY / this.config.tileSize)
        };
    }

    /**
     * Convert grid coordinates to screen coordinates
     */
    gridToScreen(gridX, gridY) {
        return {
            x: gridX * this.config.tileSize,
            y: gridY * this.config.tileSize
        };
    }
}

export default CombatRenderer;
