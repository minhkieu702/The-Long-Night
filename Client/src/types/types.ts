// ─────────────────────────────────────────────
// Server Contract Types — aligned to actual server DTOs
// ─────────────────────────────────────────────

/** Result returned by the JoinedGame event */
export interface JoinGameResult {
    roomId: string;
    mapWidth: number;
    mapHeight: number;
    startX: number;
    startY: number;
}

/** Full game state snapshot broadcast every tick */
export interface GameStateSnapshot {
    roomId: string;
    status: string; // "WaitingForPlayers" | "Playing" | "LevelUpPause" | "GameOver"
    currentWave: number;
    players: PlayerSnapshot[];
    enemies: EnemySnapshot[];
    bullets: BulletSnapshot[];
}

export interface PlayerSnapshot {
    connectionId: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    levelUpPending: boolean;
    skillChoices: string[] | null;
}

export interface EnemySnapshot {
    id: number;
    type: string; // "Normal" | "Fast" | "Tank" | "Boss"
    x: number;
    y: number;
    hp: number;
    maxHp: number;
}

export interface BulletSnapshot {
    id: number;
    x: number;
    y: number;
}

/** Skill indices matching server SkillType enum */
export enum SkillType {
    MaxHp = 0,
    Speed = 1,
    FireRate = 2,
    Damage = 3,
    ProjectileCount = 4,
}

/** Human-readable descriptions for skills */
export const SKILL_INFO: Record<string, { name: string; desc: string; color: number }> = {
    'MaxHp': { name: '❤️ Max HP', desc: 'Increase maximum health', color: 0xe74c3c },
    'Speed': { name: '💨 Speed', desc: 'Move faster', color: 0x3498db },
    'FireRate': { name: '🔥 Fire Rate', desc: 'Shoot more often', color: 0xe67e22 },
    'Damage': { name: '⚔️ Damage', desc: 'Deal more damage', color: 0x9b59b6 },
    'ProjectileCount': { name: '🎯 Projectiles', desc: 'Fire more bullets', color: 0x1abc9c },
};
