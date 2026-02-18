import Phaser from 'phaser';
import { network } from '../network/SignalRClient';

/**
 * GameOverScene — Shows final stats and buttons to return to menu or start a new game.
 */
export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create(data: { wave: number; level: number }): void {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        // Dark overlay
        const bg = this.add.graphics();
        bg.fillStyle(0x0a0a0f, 0.95);
        bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Skull / death icon
        this.add.text(cx, cy - 140, '💀', { fontSize: '72px' }).setOrigin(0.5);

        // Title
        const title = this.add.text(cx, cy - 60, 'GAME OVER', {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: '#ff3344',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#ff3344', blur: 30, fill: true },
        }).setOrigin(0.5);

        // Fade-in title
        title.setAlpha(0);
        this.tweens.add({
            targets: title,
            alpha: 1,
            duration: 1000,
            ease: 'Power2',
        });

        // Stats
        const wave = data?.wave ?? 0;
        const level = data?.level ?? 1;
        this.add.text(cx, cy + 10, `Wave Reached: ${wave}`, {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#ffcc00',
        }).setOrigin(0.5);

        this.add.text(cx, cy + 45, `Final Level: ${level}`, {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#66ccff',
        }).setOrigin(0.5);

        // Listen for NewGameStarted from server
        network.onNewGameStarted((result) => {
            network.offNewGameStarted();
            this.scene.start('GameScene', {
                roomId: result.roomId,
                mapWidth: result.mapWidth,
                mapHeight: result.mapHeight,
                startX: result.startX,
                startY: result.startY,
                connectionId: network.connectionId,
            });
        });

        // Buttons (after a short delay)
        this.time.delayedCall(1500, () => {
            // ── New Game button ──
            const newGameBtn = this.add.text(cx, cy + 110, '[ NEW GAME ]', {
                fontFamily: 'monospace',
                fontSize: '22px',
                color: '#ffcc00',
                padding: { x: 16, y: 8 },
                shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 10, fill: true },
            })
                .setOrigin(0.5)
                .setAlpha(0)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => newGameBtn.setColor('#ffee66').setScale(1.1))
                .on('pointerout', () => newGameBtn.setColor('#ffcc00').setScale(1))
                .on('pointerdown', () => {
                    newGameBtn.disableInteractive();
                    newGameBtn.setText('Starting...');
                    network.requestNewGame();
                });

            this.tweens.add({ targets: newGameBtn, alpha: 1, duration: 500 });

            // ── Return to Menu button ──
            const menuBtn = this.add.text(cx, cy + 160, '[ RETURN TO MENU ]', {
                fontFamily: 'monospace',
                fontSize: '22px',
                color: '#00ff88',
                padding: { x: 16, y: 8 },
                shadow: { offsetX: 0, offsetY: 0, color: '#00ff88', blur: 10, fill: true },
            })
                .setOrigin(0.5)
                .setAlpha(0)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => menuBtn.setColor('#66ffaa').setScale(1.1))
                .on('pointerout', () => menuBtn.setColor('#00ff88').setScale(1))
                .on('pointerdown', () => {
                    network.offNewGameStarted();
                    this.scene.start('MenuScene');
                });

            this.tweens.add({ targets: menuBtn, alpha: 1, duration: 500 });
        });
    }
}
