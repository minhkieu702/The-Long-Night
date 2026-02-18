import Phaser from 'phaser';
import type { PlayerSnapshot } from '../types/types';

/**
 * HUD — Fixed-position UI overlay rendered on top of the game scene.
 * Displays HP bar, XP bar, level, wave counter, and player count.
 */
export class HUD {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;

    // HP bar
    private hpBarBg!: Phaser.GameObjects.Graphics;
    private hpBarFill!: Phaser.GameObjects.Graphics;
    private hpText!: Phaser.GameObjects.Text;

    // XP bar
    private xpBarBg!: Phaser.GameObjects.Graphics;
    private xpBarFill!: Phaser.GameObjects.Graphics;

    // Info texts
    private levelText!: Phaser.GameObjects.Text;
    private waveText!: Phaser.GameObjects.Text;
    private playerCountText!: Phaser.GameObjects.Text;
    private statusText!: Phaser.GameObjects.Text;

    // Dimensions
    private readonly BAR_W = 240;
    private readonly BAR_H = 18;
    private readonly XP_BAR_H = 8;
    private readonly MARGIN = 16;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);
        this.createElements();
    }

    private createElements(): void {
        const m = this.MARGIN;

        // ── HP Bar ──
        this.hpBarBg = this.scene.add.graphics();
        this.hpBarFill = this.scene.add.graphics();
        this.container.add([this.hpBarBg, this.hpBarFill]);

        this.hpText = this.scene.add.text(m + this.BAR_W / 2, m + this.BAR_H / 2, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.container.add(this.hpText);

        // ── XP Bar ──
        this.xpBarBg = this.scene.add.graphics();
        this.xpBarFill = this.scene.add.graphics();
        this.container.add([this.xpBarBg, this.xpBarFill]);

        // ── Level ──
        this.levelText = this.scene.add.text(m, m + this.BAR_H + this.XP_BAR_H + 14, '', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffcc00',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 6, fill: true },
        });
        this.container.add(this.levelText);

        // ── Wave counter (top-right) ──
        this.waveText = this.scene.add.text(
            this.scene.cameras.main.width - m, m,
            '',
            {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#ff6644',
                fontStyle: 'bold',
                shadow: { offsetX: 0, offsetY: 0, color: '#ff6644', blur: 8, fill: true },
            }
        ).setOrigin(1, 0);
        this.container.add(this.waveText);

        // ── Player count ──
        this.playerCountText = this.scene.add.text(
            this.scene.cameras.main.width - m, m + 26,
            '',
            {
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#8888aa',
            }
        ).setOrigin(1, 0);
        this.container.add(this.playerCountText);

        // ── Status text (center top) ──
        this.statusText = this.scene.add.text(
            this.scene.cameras.main.width / 2, m,
            '',
            {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ffaa00',
            }
        ).setOrigin(0.5, 0);
        this.container.add(this.statusText);
    }

    update(player: PlayerSnapshot | null, wave: number, playerCount: number, status: string, isSpectating: boolean = false): void {
        const m = this.MARGIN;

        if (player) {
            // HP Bar
            const hpRatio = Math.max(0, player.hp / player.maxHp);
            this.hpBarBg.clear();
            this.hpBarBg.fillStyle(0x222222, 0.8);
            this.hpBarBg.fillRoundedRect(m, m, this.BAR_W, this.BAR_H, 4);
            this.hpBarBg.lineStyle(1, 0x444444, 0.6);
            this.hpBarBg.strokeRoundedRect(m, m, this.BAR_W, this.BAR_H, 4);

            // Color gradient based on health
            const hpColor = hpRatio > 0.5 ? 0x00ff66 : hpRatio > 0.25 ? 0xffaa00 : 0xff3333;
            this.hpBarFill.clear();
            this.hpBarFill.fillStyle(hpColor, 0.9);
            this.hpBarFill.fillRoundedRect(m + 2, m + 2, (this.BAR_W - 4) * hpRatio, this.BAR_H - 4, 3);

            this.hpText.setText(`${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`);
            this.hpText.setPosition(m + this.BAR_W / 2, m + this.BAR_H / 2);

            // XP Bar
            const xpRatio = player.xpToNextLevel > 0 ? Math.min(1, player.xp / player.xpToNextLevel) : 0;
            const xpY = m + this.BAR_H + 3;
            this.xpBarBg.clear();
            this.xpBarBg.fillStyle(0x111133, 0.8);
            this.xpBarBg.fillRoundedRect(m, xpY, this.BAR_W, this.XP_BAR_H, 2);

            this.xpBarFill.clear();
            this.xpBarFill.fillStyle(0x3399ff, 0.9);
            this.xpBarFill.fillRoundedRect(m + 1, xpY + 1, (this.BAR_W - 2) * xpRatio, this.XP_BAR_H - 2, 2);

            // Level
            this.levelText.setText(`LV ${player.level}`);
        }

        // Wave
        this.waveText.setText(`WAVE ${wave}`);

        // Player count
        this.playerCountText.setText(`👥 ${playerCount}`);

        // Status
        if (isSpectating) {
            this.statusText.setText('👁 SPECTATING — Q / E to switch');
            this.statusText.setColor('#ff6688');
        } else if (status === 'Paused') {
            this.statusText.setText('⏸ PAUSED — Press P to resume');
            this.statusText.setColor('#ff8844');
        } else if (status === 'LevelUpPause') {
            this.statusText.setText('⏸ LEVEL UP — Choose a skill!');
            this.statusText.setColor('#ffcc00');
        } else if (status === 'WaitingForPlayers') {
            this.statusText.setText('⏳ Waiting for players...');
            this.statusText.setColor('#8888aa');
        } else {
            this.statusText.setText('');
        }
    }

    destroy(): void {
        this.container.destroy(true);
    }
}
