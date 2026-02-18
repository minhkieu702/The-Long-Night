import Phaser from 'phaser';

/**
 * BootScene — Generates placeholder textures at runtime and transitions to Menu.
 * No external asset files needed; everything is drawn via Phaser Graphics.
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload(): void {
        // Nothing to load from disk — we generate all textures in create()
    }

    create(): void {
        this.generateTextures();
        this.scene.start('MenuScene');
    }

    private generateTextures(): void {
        // Player — bright cyan circle
        this.createCircleTexture('player', 16, 0x00e5ff);
        // Other players — green circle
        this.createCircleTexture('player_other', 16, 0x66ff66);
        // Enemies by type
        this.createCircleTexture('enemy_Normal', 12, 0xff4444);
        this.createCircleTexture('enemy_Fast', 10, 0xffaa00);
        this.createCircleTexture('enemy_Tank', 18, 0x8844ff);
        this.createCircleTexture('enemy_Boss', 28, 0xff0066);
        // Bullet — small yellow circle
        this.createCircleTexture('bullet', 4, 0xffff00);
        // HP bar segments
        this.createRectTexture('bar_bg', 40, 4, 0x333333);
        this.createRectTexture('bar_hp', 40, 4, 0x00ff66);
        this.createRectTexture('bar_hp_enemy', 30, 3, 0xff3333);
        // Map grid tile
        this.createGridTile('grid_tile', 64, 0x1a1a2e, 0x2a2a4e);
    }

    private createCircleTexture(key: string, radius: number, color: number): void {
        const gfx = this.add.graphics().setVisible(false);
        // Glow effect
        gfx.fillStyle(color, 0.2);
        gfx.fillCircle(radius + 4, radius + 4, radius + 4);
        // Main circle
        gfx.fillStyle(color, 1);
        gfx.fillCircle(radius + 4, radius + 4, radius);
        // Highlight
        gfx.fillStyle(0xffffff, 0.3);
        gfx.fillCircle(radius + 1, radius + 1, radius * 0.4);
        gfx.generateTexture(key, (radius + 4) * 2, (radius + 4) * 2);
        gfx.destroy();
    }

    private createRectTexture(key: string, w: number, h: number, color: number): void {
        const gfx = this.add.graphics().setVisible(false);
        gfx.fillStyle(color, 1);
        gfx.fillRoundedRect(0, 0, w, h, 2);
        gfx.generateTexture(key, w, h);
        gfx.destroy();
    }

    private createGridTile(key: string, size: number, fillColor: number, lineColor: number): void {
        const gfx = this.add.graphics().setVisible(false);
        gfx.fillStyle(fillColor, 1);
        gfx.fillRect(0, 0, size, size);
        gfx.lineStyle(1, lineColor, 0.3);
        gfx.strokeRect(0, 0, size, size);
        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }
}
