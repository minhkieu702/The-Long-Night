import Phaser from 'phaser';
import { network } from '../network/SignalRClient';
import { SKILL_INFO } from '../types/types';

/**
 * SkillPanel — Modal overlay for level-up skill selection.
 * Displays 3 skill choices as interactive cards. Calls SelectSkill on click.
 */
export class SkillPanel {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private isVisible = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0).setDepth(2000).setScrollFactor(0).setVisible(false);
    }

    show(skillChoices: string[]): void {
        if (this.isVisible) return;
        this.isVisible = true;
        this.container.removeAll(true);
        this.container.setVisible(true);

        const w = this.scene.cameras.main.width;
        const h = this.scene.cameras.main.height;

        // Dark backdrop
        const backdrop = this.scene.add.graphics();
        backdrop.fillStyle(0x000000, 0.7);
        backdrop.fillRect(0, 0, w, h);
        // Make backdrop interactive to block clicks behind it
        backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
        this.container.add(backdrop);

        // Title
        const title = this.scene.add.text(w / 2, h / 2 - 140, '⬆ LEVEL UP! ⬆', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#ffcc00',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 15, fill: true },
        }).setOrigin(0.5);
        this.container.add(title);

        const subtitle = this.scene.add.text(w / 2, h / 2 - 105, 'Choose an upgrade:', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#aaaacc',
        }).setOrigin(0.5);
        this.container.add(subtitle);

        // Skill cards
        const cardWidth = 180;
        const cardHeight = 150;
        const gap = 20;
        const totalWidth = skillChoices.length * cardWidth + (skillChoices.length - 1) * gap;
        const startX = (w - totalWidth) / 2;

        skillChoices.forEach((skillName, index) => {
            const info = SKILL_INFO[skillName] ?? { name: skillName, desc: '', color: 0x888888 };
            const x = startX + index * (cardWidth + gap);
            const y = h / 2 - 40;

            // Card background
            const card = this.scene.add.graphics();
            card.fillStyle(0x1a1a2e, 0.95);
            card.fillRoundedRect(x, y, cardWidth, cardHeight, 12);
            card.lineStyle(2, info.color, 0.8);
            card.strokeRoundedRect(x, y, cardWidth, cardHeight, 12);

            // Hit area for interaction
            const hitZone = this.scene.add.zone(x + cardWidth / 2, y + cardHeight / 2, cardWidth, cardHeight)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => {
                    card.clear();
                    card.fillStyle(0x2a2a4e, 0.95);
                    card.fillRoundedRect(x, y - 4, cardWidth, cardHeight, 12);
                    card.lineStyle(3, info.color, 1);
                    card.strokeRoundedRect(x, y - 4, cardWidth, cardHeight, 12);
                })
                .on('pointerout', () => {
                    card.clear();
                    card.fillStyle(0x1a1a2e, 0.95);
                    card.fillRoundedRect(x, y, cardWidth, cardHeight, 12);
                    card.lineStyle(2, info.color, 0.8);
                    card.strokeRoundedRect(x, y, cardWidth, cardHeight, 12);
                })
                .on('pointerdown', () => {
                    this.selectSkill(index, skillName);
                });

            // Skill name
            const nameText = this.scene.add.text(x + cardWidth / 2, y + 40, info.name, {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: `#${info.color.toString(16).padStart(6, '0')}`,
                fontStyle: 'bold',
                align: 'center',
            }).setOrigin(0.5);

            // Description
            const descText = this.scene.add.text(x + cardWidth / 2, y + 80, info.desc, {
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#8888aa',
                align: 'center',
                wordWrap: { width: cardWidth - 20 },
            }).setOrigin(0.5);

            // Keybind hint
            const keyText = this.scene.add.text(x + cardWidth / 2, y + cardHeight - 20, `[ ${index + 1} ]`, {
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#666688',
            }).setOrigin(0.5);

            this.container.add([card, hitZone, nameText, descText, keyText]);
        });
        console.log(skillChoices);
        // Keyboard shortcuts (1, 2, 3)
        this.scene.input.keyboard?.once('keydown-ONE', () => this.selectSkill(0, skillChoices[0]));
        this.scene.input.keyboard?.once('keydown-TWO', () => {
            if (skillChoices.length > 1) this.selectSkill(1, skillChoices[1]);
        });
        this.scene.input.keyboard?.once('keydown-THREE', () => {
            if (skillChoices.length > 2) this.selectSkill(2, skillChoices[2]);
        });
    }

    private selectSkill(index: number, skillName: string): void {
        if (!this.isVisible) return;

        // Map skill name to server enum index
        const enumMap: Record<string, number> = {
            'MaxHp': 0,
            'Speed': 1,
            'FireRate': 2,
            'Damage': 3,
            'ProjectileCount': 4,
        };

        const skillIndex = enumMap[skillName] ?? index;
        network.selectSkill(skillIndex);
        this.hide();
    }

    hide(): void {
        this.isVisible = false;
        this.container.setVisible(false);
        this.container.removeAll(true);
    }

    get visible(): boolean {
        return this.isVisible;
    }

    destroy(): void {
        this.container.destroy(true);
    }
}
