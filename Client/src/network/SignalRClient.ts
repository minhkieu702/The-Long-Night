import * as signalR from '@microsoft/signalr';
import type { JoinGameResult, GameStateSnapshot } from '../types/types';

const HUB_URL = 'https://localhost:7198/gamehub';

/**
 * Singleton SignalR client — manages the connection to the game server.
 * All game state flows through this; the client never computes game logic.
 */
class SignalRClient {
    private connection: signalR.HubConnection | null = null;
    private _connectionId: string | null = null;

    get connectionId(): string | null {
        return this._connectionId;
    }

    // ───── Connection lifecycle ─────

    async connect(): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) return;

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL)
            .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        this.connection.onreconnecting(() => console.warn('[SignalR] Reconnecting...'));
        this.connection.onreconnected((id) => {
            console.log('[SignalR] Reconnected:', id);
            this._connectionId = id ?? null;
        });
        this.connection.onclose(() => console.warn('[SignalR] Connection closed'));

        await this.connection.start();
        this._connectionId = this.connection.connectionId ?? null;
        console.log('[SignalR] Connected:', this._connectionId);
    }

    async disconnect(): Promise<void> {
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
            this._connectionId = null;
        }
    }

    // ───── Client → Server methods ─────

    async joinGame(): Promise<void> {
        this.connection!.invoke('JoinGame');
    }

    sendInput(directionX: number, directionY: number): void {
        this.connection?.send('SendInput', directionX, directionY);
    }

    selectSkill(skillIndex: number): void {
        this.connection?.send('SelectSkill', skillIndex);
    }

    togglePause(): void {
        this.connection?.send('TogglePause');
    }

    // ───── Server → Client event listeners ─────

    onJoinedGame(callback: (result: JoinGameResult) => void): void {
        this.connection?.on('JoinedGame', callback);
    }

    onReceiveGameState(callback: (snapshot: GameStateSnapshot) => void): void {
        this.connection?.on('ReceiveGameState', callback);
    }

    offReceiveGameState(): void {
        this.connection?.off('ReceiveGameState');
    }

    onGamePaused(callback: (isPaused: boolean) => void): void {
        this.connection?.on('GamePaused', callback);
    }

    offGamePaused(): void {
        this.connection?.off('GamePaused');
    }

    onNewGameStarted(callback: (result: JoinGameResult) => void): void {
        this.connection?.on('NewGameStarted', callback);
    }

    offNewGameStarted(): void {
        this.connection?.off('NewGameStarted');
    }

    // ───── Client → Server: New Game ─────

    requestNewGame(): void {
        this.connection?.send('RequestNewGame');
    }
}

/** Global singleton */
export const network = new SignalRClient();
