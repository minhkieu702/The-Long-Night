import Phaser from 'phaser';
import { network } from '../network/SignalRClient';

/**
 * MenuScene — Title screen with a "Join Game" button.
 * Connects to the server and transitions to GameScene on success.
 */
export class MenuScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private joinBtn!: Phaser.GameObjects.Text;
    private isConnecting = false;

    constructor() {
        super({ key: 'MenuScene' });
    }

    create(): void {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        // ── Background gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a0a3e, 0x1a0a3e, 1);
        bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // ── Animated particles (simple floating dots)
        for (let i = 0; i < 40; i++) {
            const dot = this.add.circle(
                Phaser.Math.Between(0, this.cameras.main.width),
                Phaser.Math.Between(0, this.cameras.main.height),
                Phaser.Math.Between(1, 3),
                0xffffff,
                Phaser.Math.FloatBetween(0.1, 0.4)
            );
            this.tweens.add({
                targets: dot,
                y: dot.y - Phaser.Math.Between(30, 100),
                alpha: 0,
                duration: Phaser.Math.Between(3000, 6000),
                repeat: -1,
                yoyo: true,
                ease: 'Sine.easeInOut',
            });
        }

        // ── Title
        this.add.text(cx, cy - 120, '🌙 THE LONG NIGHT', {
            fontFamily: 'monospace',
            fontSize: '42px',
            color: '#00e5ff',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#00e5ff', blur: 20, fill: true },
        }).setOrigin(0.5);

        // ── Subtitle
        this.add.text(cx, cy - 65, 'Survive together. Fight the hordes.', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#8888aa',
        }).setOrigin(0.5);

        // ── Join button
        this.joinBtn = this.add.text(cx, cy + 30, '[ JOIN GAME ]', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#00ff88',
            padding: { x: 24, y: 12 },
            shadow: { offsetX: 0, offsetY: 0, color: '#00ff88', blur: 10, fill: true },
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.joinBtn.setScale(1.1);
                this.joinBtn.setColor('#66ffaa');
            })
            .on('pointerout', () => {
                this.joinBtn.setScale(1);
                this.joinBtn.setColor('#00ff88');
            })
            .on('pointerdown', () => this.handleJoin());

        // Pulse animation
        this.tweens.add({
            targets: this.joinBtn,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // ── Status text
        this.statusText = this.add.text(cx, cy + 100, '', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffaa00',
        }).setOrigin(0.5);
    }

    private async handleJoin(): Promise<void> {
        if (this.isConnecting) return;
        this.isConnecting = true;
        this.joinBtn.disableInteractive();
        this.statusText.setText('Connecting to server...');

        try {
            await network.connect();
            this.statusText.setText('Connected! Joining game...');

            network.onJoinedGame((result) => {
                this.statusText.setText(`Joined room ${result.roomId}!`);
                this.scene.start('GameScene', {
                    roomId: result.roomId,
                    mapWidth: result.mapWidth,
                    mapHeight: result.mapHeight,
                    startX: result.startX,
                    startY: result.startY,
                    connectionId: network.connectionId,
                });
            });

            await network.joinGame();
        } catch (err) {
            console.error('[MenuScene] Join failed:', err);
            this.statusText.setText('Connection failed! Click to retry.');
            this.isConnecting = false;
            this.joinBtn.setInteractive({ useHandCursor: true });
        }
    }
}
