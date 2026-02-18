import Phaser from 'phaser';
import { network } from '../network/SignalRClient';
import { HUD } from '../ui/HUD';
import { SkillPanel } from '../ui/SkillPanel';
import type { GameStateSnapshot, PlayerSnapshot, EnemySnapshot, BulletSnapshot } from '../types/types';

// ─── Constants ───
const LERP_SPEED = 0.2; // interpolation factor for smooth movement

/** Texture key for an enemy type, with fallback */
function enemyTextureKey(type: string): string {
    const key = `enemy_${type}`;
    return ['enemy_Normal', 'enemy_Fast', 'enemy_Tank', 'enemy_Boss'].includes(key) ? key : 'enemy_Normal';
}

/**
 * GameScene — The main rendering scene.
 * Purely a renderer and input sender. All game logic is on the server.
 */
export class GameScene extends Phaser.Scene {
    // ── Scene init data ──
    private myConnectionId!: string;
    private mapWidth!: number;
    private mapHeight!: number;

    // ── Latest snapshot from server ──
    private latestSnapshot: GameStateSnapshot | null = null;

    // ── Entity sprite pools ──
    private playerSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
    private playerLabels: Map<string, Phaser.GameObjects.Text> = new Map();
    private playerHpBars: Map<string, { bg: Phaser.GameObjects.Graphics; fill: Phaser.GameObjects.Graphics }> = new Map();
    private enemySprites: Map<number, Phaser.GameObjects.Sprite> = new Map();
    private enemyHpBars: Map<number, { bg: Phaser.GameObjects.Graphics; fill: Phaser.GameObjects.Graphics }> = new Map();
    private bulletSprites: Map<number, Phaser.GameObjects.Sprite> = new Map();

    // ── Input ──
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

    // ── UI ──
    private hud!: HUD;
    private skillPanel!: SkillPanel;

    // ── State tracking ──
    private gameOver = false;
    private lastSentDirX = 0;
    private lastSentDirY = 0;

    // ── Spectator mode ──
    private isSpectating = false;
    private spectateTargetId: string | null = null;
    private spectateOverlay: Phaser.GameObjects.Container | null = null;
    private spectateKeys!: { Q: Phaser.Input.Keyboard.Key; E: Phaser.Input.Keyboard.Key };

    // ── Pause ──
    private isPaused = false;
    private pauseKey!: Phaser.Input.Keyboard.Key;
    private pauseOverlay: Phaser.GameObjects.Container | null = null;

    constructor() {
        super({ key: 'GameScene' });
    }

    init(data: { roomId: string; mapWidth: number; mapHeight: number; startX: number; startY: number; connectionId: string }): void {
        this.myConnectionId = data.connectionId;
        this.mapWidth = data.mapWidth;
        this.mapHeight = data.mapHeight;
        this.gameOver = false;
        this.isSpectating = false;
        this.isPaused = false;
        this.spectateTargetId = null;
        this.latestSnapshot = null;
        this.playerSprites.clear();
        this.playerLabels.clear();
        this.playerHpBars.clear();
        this.enemySprites.clear();
        this.enemyHpBars.clear();
        this.bulletSprites.clear();
    }

    create(): void {
        // ── Map background ──
        this.createMapBackground();

        // ── Camera ──
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameras.main.setBackgroundColor(0x0a0a1a);

        // ── Input ──
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = {
            W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };

        // Spectator keys
        this.spectateKeys = {
            Q: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        };

        // Pause key (P or Escape)
        this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

        // ── UI ──
        this.hud = new HUD(this);
        this.skillPanel = new SkillPanel(this);

        // ── Network listener ──
        network.onReceiveGameState((snapshot) => {
            this.latestSnapshot = snapshot;
        });

        // ── Listen for pause state from server ──
        network.onGamePaused((isPaused: boolean) => {
            this.isPaused = isPaused;
            if (isPaused) {
                this.showPauseOverlay();
            } else {
                this.hidePauseOverlay();
            }
        });

        // ── Listen for new game started (in case room resets while in this scene) ──
        network.onNewGameStarted((result) => {
            // Re-init the scene with new data
            this.scene.restart({
                roomId: result.roomId,
                mapWidth: result.mapWidth,
                mapHeight: result.mapHeight,
                startX: result.startX,
                startY: result.startY,
                connectionId: network.connectionId,
            });
        });
    }

    update(): void {
        if (!this.latestSnapshot || this.gameOver) return;

        const snap = this.latestSnapshot;

        // ── Check game over (ALL players dead) ──
        if (snap.status === 'GameOver') {
            this.handleGameOver(snap);
            return;
        }

        // ── Find local player data ──
        const myData = snap.players.find((p) => p.connectionId === this.myConnectionId) ?? null;

        // ── Check if local player is dead → enter spectator mode ──
        if (myData && myData.hp <= 0 && !this.isSpectating) {
            this.enterSpectatorMode(snap);
        }

        // ── Process input (only when alive, not paused, and skill panel is hidden) ──
        if (!this.isSpectating && !this.skillPanel.visible && !this.isPaused) {
            this.processInput();
        }

        // ── Handle pause toggle key ──
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey) && !this.isSpectating && !this.skillPanel.visible) {
            network.togglePause();
        }

        // ── Handle spectator cycling ──
        if (this.isSpectating) {
            this.handleSpectateCycle(snap);
        }

        // ── Sync entities ──
        this.syncPlayers(snap.players);
        this.syncEnemies(snap.enemies);
        this.syncBullets(snap.bullets);

        // ── Update camera ──
        if (this.isSpectating) {
            // Follow the spectate target
            const targetSprite = this.spectateTargetId ? this.playerSprites.get(this.spectateTargetId) : null;
            if (targetSprite) {
                this.cameras.main.startFollow(targetSprite, true, 0.1, 0.1);
            }
        } else {
            // Follow local player
            const mySprite = this.playerSprites.get(this.myConnectionId);
            if (mySprite) {
                this.cameras.main.startFollow(mySprite, true, 0.1, 0.1);
            }
        }

        // ── Update HUD ──
        this.hud.update(myData, snap.currentWave, snap.players.length, snap.status, this.isSpectating);

        // ── Handle level-up overlay (only when alive) ──
        if (!this.isSpectating && myData?.levelUpPending && myData.skillChoices && myData.skillChoices.length > 0) {
            if (!this.skillPanel.visible) {
                this.skillPanel.show(myData.skillChoices);
            }
        } else {
            if (this.skillPanel.visible) {
                this.skillPanel.hide();
            }
        }
    }

    // ═══════════════════════════════════════════
    // INPUT
    // ═══════════════════════════════════════════

    private processInput(): void {
        let dx = 0;
        let dy = 0;

        if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;

        // Normalize
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        // Only send if direction changed (reduce network traffic)
        if (dx !== this.lastSentDirX || dy !== this.lastSentDirY) {
            this.lastSentDirX = dx;
            this.lastSentDirY = dy;
            network.sendInput(dx, dy);
        }
    }

    // ═══════════════════════════════════════════
    // SPECTATOR MODE
    // ═══════════════════════════════════════════

    private enterSpectatorMode(snap: GameStateSnapshot): void {
        this.isSpectating = true;

        // Stop sending movement
        if (this.lastSentDirX !== 0 || this.lastSentDirY !== 0) {
            this.lastSentDirX = 0;
            this.lastSentDirY = 0;
            network.sendInput(0, 0);
        }

        // Find first alive player to spectate
        const alivePlayer = snap.players.find((p) => p.connectionId !== this.myConnectionId && p.hp > 0);
        this.spectateTargetId = alivePlayer?.connectionId ?? null;

        // Create spectator overlay
        this.createSpectatorOverlay();
    }

    private createSpectatorOverlay(): void {
        if (this.spectateOverlay) {
            this.spectateOverlay.destroy(true);
        }

        const w = this.cameras.main.width;

        this.spectateOverlay = this.add.container(0, 0).setDepth(1500).setScrollFactor(0);

        // Top banner
        const bannerBg = this.add.graphics();
        bannerBg.fillStyle(0x000000, 0.6);
        bannerBg.fillRect(0, 0, w, 80);
        this.spectateOverlay.add(bannerBg);

        // Death text
        const deathText = this.add.text(w / 2, 20, '💀 YOU DIED', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#ff3344',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#ff3344', blur: 15, fill: true },
        }).setOrigin(0.5, 0);
        this.spectateOverlay.add(deathText);

        // Spectating hint
        const hintText = this.add.text(w / 2, 55, 'Spectating... Press Q / E to switch player', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#aaaacc',
        }).setOrigin(0.5, 0);
        this.spectateOverlay.add(hintText);

        // Pulse animation on death text
        this.tweens.add({
            targets: deathText,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private handleSpectateCycle(snap: GameStateSnapshot): void {
        const alivePlayers = snap.players.filter((p) => p.hp > 0 && p.connectionId !== this.myConnectionId);

        if (alivePlayers.length === 0) {
            this.spectateTargetId = null;
            return;
        }

        // Find current index
        const currentIdx = alivePlayers.findIndex((p) => p.connectionId === this.spectateTargetId);

        if (Phaser.Input.Keyboard.JustDown(this.spectateKeys.E)) {
            // Next player
            const nextIdx = (currentIdx + 1) % alivePlayers.length;
            this.spectateTargetId = alivePlayers[nextIdx].connectionId;
        } else if (Phaser.Input.Keyboard.JustDown(this.spectateKeys.Q)) {
            // Previous player
            const prevIdx = (currentIdx - 1 + alivePlayers.length) % alivePlayers.length;
            this.spectateTargetId = alivePlayers[prevIdx].connectionId;
        }

        // If current target died, switch to another
        if (currentIdx === -1 && alivePlayers.length > 0) {
            this.spectateTargetId = alivePlayers[0].connectionId;
        }
    }

    // ═══════════════════════════════════════════
    // PAUSE OVERLAY
    // ═══════════════════════════════════════════

    private showPauseOverlay(): void {
        if (this.pauseOverlay) return;

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.pauseOverlay = this.add.container(0, 0).setDepth(1800).setScrollFactor(0);

        // Dark backdrop
        const backdrop = this.add.graphics();
        backdrop.fillStyle(0x000000, 0.5);
        backdrop.fillRect(0, 0, w, h);
        backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
        backdrop.on('pointerdown', () => network.togglePause());
        this.pauseOverlay.add(backdrop);

        // Pause icon
        const pauseTitle = this.add.text(w / 2, h / 2 - 30, '⏸ PAUSED', {
            fontFamily: 'monospace',
            fontSize: '42px',
            color: '#ff8844',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#ff8844', blur: 20, fill: true },
        }).setOrigin(0.5);
        this.pauseOverlay.add(pauseTitle);

        // Hint
        const hint = this.add.text(w / 2, h / 2 + 25, 'Press P or click to resume', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#aaaacc',
        }).setOrigin(0.5);
        this.pauseOverlay.add(hint);

        // Pulse animation
        this.tweens.add({
            targets: pauseTitle,
            alpha: 0.6,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private hidePauseOverlay(): void {
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy(true);
            this.pauseOverlay = null;
        }
    }

    // ═══════════════════════════════════════════
    // ENTITY SYNC — create / update / destroy
    // ═══════════════════════════════════════════

    private syncPlayers(players: PlayerSnapshot[]): void {
        const activeIds = new Set<string>();

        for (const p of players) {
            activeIds.add(p.connectionId);
            const isMe = p.connectionId === this.myConnectionId;

            // ── Get or create sprite ──
            let sprite = this.playerSprites.get(p.connectionId);
            if (!sprite) {
                sprite = this.add.sprite(p.x, p.y, isMe ? 'player' : 'player_other').setDepth(10);
                this.playerSprites.set(p.connectionId, sprite);

                // Label
                const label = this.add.text(p.x, p.y - 24, isMe ? 'YOU' : `P`, {
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    color: isMe ? '#00e5ff' : '#66ff66',
                }).setOrigin(0.5).setDepth(11);
                this.playerLabels.set(p.connectionId, label);

                // HP bar
                const bg = this.add.graphics().setDepth(11);
                const fill = this.add.graphics().setDepth(12);
                this.playerHpBars.set(p.connectionId, { bg, fill });
            }

            // ── Lerp position ──
            sprite.x = Phaser.Math.Linear(sprite.x, p.x, LERP_SPEED);
            sprite.y = Phaser.Math.Linear(sprite.y, p.y, LERP_SPEED);

            // Dead state
            sprite.setAlpha(p.hp <= 0 ? 0.3 : 1);

            // Update label
            const label = this.playerLabels.get(p.connectionId);
            if (label) {
                label.setPosition(sprite.x, sprite.y - 24);
                // Highlight spectate target
                if (this.isSpectating && p.connectionId === this.spectateTargetId) {
                    label.setText('👁 SPECTATING');
                    label.setColor('#ffcc00');
                } else if (isMe) {
                    label.setText(this.isSpectating ? '💀' : 'YOU');
                    label.setColor('#00e5ff');
                } else {
                    label.setText('P');
                    label.setColor('#66ff66');
                }
            }

            // Update HP bar
            const hpBar = this.playerHpBars.get(p.connectionId);
            if (hpBar) {
                const barW = 36;
                const barH = 4;
                const barX = sprite.x - barW / 2;
                const barY = sprite.y - 18;

                hpBar.bg.clear();
                hpBar.bg.fillStyle(0x333333, 0.8);
                hpBar.bg.fillRect(barX, barY, barW, barH);

                const ratio = Math.max(0, p.hp / p.maxHp);
                hpBar.fill.clear();
                hpBar.fill.fillStyle(ratio > 0.5 ? 0x00ff66 : ratio > 0.25 ? 0xffaa00 : 0xff3333, 1);
                hpBar.fill.fillRect(barX, barY, barW * ratio, barH);
            }
        }

        // ── Remove departed players ──
        for (const [id, sprite] of this.playerSprites) {
            if (!activeIds.has(id)) {
                sprite.destroy();
                this.playerSprites.delete(id);
                this.playerLabels.get(id)?.destroy();
                this.playerLabels.delete(id);
                const bars = this.playerHpBars.get(id);
                bars?.bg.destroy();
                bars?.fill.destroy();
                this.playerHpBars.delete(id);
            }
        }
    }

    private syncEnemies(enemies: EnemySnapshot[]): void {
        const activeIds = new Set<number>();

        for (const e of enemies) {
            activeIds.add(e.id);

            let sprite = this.enemySprites.get(e.id);
            if (!sprite) {
                sprite = this.add.sprite(e.x, e.y, enemyTextureKey(e.type)).setDepth(5);
                this.enemySprites.set(e.id, sprite);

                const bg = this.add.graphics().setDepth(6);
                const fill = this.add.graphics().setDepth(7);
                this.enemyHpBars.set(e.id, { bg, fill });
            }

            // Lerp
            sprite.x = Phaser.Math.Linear(sprite.x, e.x, LERP_SPEED);
            sprite.y = Phaser.Math.Linear(sprite.y, e.y, LERP_SPEED);

            // HP bar
            const hpBar = this.enemyHpBars.get(e.id);
            if (hpBar) {
                const barW = 26;
                const barH = 3;
                const barX = sprite.x - barW / 2;
                const barY = sprite.y - 16;

                hpBar.bg.clear();
                hpBar.bg.fillStyle(0x333333, 0.7);
                hpBar.bg.fillRect(barX, barY, barW, barH);

                const ratio = Math.max(0, e.hp / e.maxHp);
                hpBar.fill.clear();
                hpBar.fill.fillStyle(0xff4444, 1);
                hpBar.fill.fillRect(barX, barY, barW * ratio, barH);
            }
        }

        // Remove dead enemies
        for (const [id, sprite] of this.enemySprites) {
            if (!activeIds.has(id)) {
                sprite.destroy();
                this.enemySprites.delete(id);
                const bars = this.enemyHpBars.get(id);
                bars?.bg.destroy();
                bars?.fill.destroy();
                this.enemyHpBars.delete(id);
            }
        }
    }

    private syncBullets(bullets: BulletSnapshot[]): void {
        const activeIds = new Set<number>();

        for (const b of bullets) {
            activeIds.add(b.id);

            let sprite = this.bulletSprites.get(b.id);
            if (!sprite) {
                sprite = this.add.sprite(b.x, b.y, 'bullet').setDepth(8);
                this.bulletSprites.set(b.id, sprite);
            }

            // Bullets move fast — use stronger lerp
            sprite.x = Phaser.Math.Linear(sprite.x, b.x, 0.5);
            sprite.y = Phaser.Math.Linear(sprite.y, b.y, 0.5);
        }

        // Remove expired bullets
        for (const [id, sprite] of this.bulletSprites) {
            if (!activeIds.has(id)) {
                sprite.destroy();
                this.bulletSprites.delete(id);
            }
        }
    }

    // ═══════════════════════════════════════════
    // MAP RENDERING
    // ═══════════════════════════════════════════

    private createMapBackground(): void {
        const tileSize = 64;
        const cols = Math.ceil(this.mapWidth / tileSize);
        const rows = Math.ceil(this.mapHeight / tileSize);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.add.sprite(
                    c * tileSize + tileSize / 2,
                    r * tileSize + tileSize / 2,
                    'grid_tile'
                ).setDepth(0);
            }
        }

        // Map border outline
        const border = this.add.graphics();
        border.lineStyle(3, 0xff3344, 0.6);
        border.strokeRect(0, 0, this.mapWidth, this.mapHeight);
        border.setDepth(1);
    }

    // ═══════════════════════════════════════════
    // GAME OVER
    // ═══════════════════════════════════════════

    private handleGameOver(snap: GameStateSnapshot): void {
        this.gameOver = true;
        network.offReceiveGameState();

        const myData = snap.players.find((p) => p.connectionId === this.myConnectionId);

        // Clean up spectator overlay
        if (this.spectateOverlay) {
            this.spectateOverlay.destroy(true);
            this.spectateOverlay = null;
        }

        this.time.delayedCall(1500, () => {
            this.hud.destroy();
            this.skillPanel.destroy();
            this.scene.start('GameOverScene', {
                wave: snap.currentWave,
                level: myData?.level ?? 1,
            });
        });
    }
}
