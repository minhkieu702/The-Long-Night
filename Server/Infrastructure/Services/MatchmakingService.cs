using System.Collections.Concurrent;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;

namespace Infrastructure.Services;

public class MatchmakingService : IMatchmakingService
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();

    // Maps ConnectionId → RoomId for fast lookup
    private readonly ConcurrentDictionary<string, string> _playerRoomMap = new();

    public (Room Room, bool IsNew) FindOrCreateRoom()
    {
        // Try to find an existing room that is waiting for players and not full
        foreach (var kvp in _rooms)
        {
            var room = kvp.Value;
            if ((room.Status == GameStatus.WaitingForPlayers || room.Status == GameStatus.Playing)
                && room.Players.Count < room.MaxPlayers)
            {
                return (room, false);
            }
        }

        // No available room found — create a new one
        var newRoom = new Room();
        _rooms.TryAdd(newRoom.RoomId, newRoom);
        return (newRoom, true);
    }

    public void RemovePlayer(string connectionId)
    {
        if (!_playerRoomMap.TryRemove(connectionId, out var roomId))
            return;

        if (!_rooms.TryGetValue(roomId, out var room))
            return;

        room.Players.TryRemove(connectionId, out _);

        // Clean up empty rooms
        if (room.Players.IsEmpty)
        {
            _rooms.TryRemove(roomId, out _);
        }
    }

    public Room? GetRoom(string roomId)
    {
        _rooms.TryGetValue(roomId, out var room);
        return room;
    }

    public Room? GetRoomByPlayer(string connectionId)
    {
        if (!_playerRoomMap.TryGetValue(connectionId, out var roomId))
        {
            // Fallback: scan all rooms (slower, but handles race conditions)
            foreach (var kvp in _rooms)
            {
                if (kvp.Value.Players.ContainsKey(connectionId))
                {
                    _playerRoomMap.TryAdd(connectionId, kvp.Key);
                    return kvp.Value;
                }
            }
            return null;
        }

        _rooms.TryGetValue(roomId, out var room);
        return room;
    }

    public IEnumerable<Room> GetAllActiveRooms()
    {
        return _rooms.Values.Where(r => r.Status == GameStatus.Playing || r.Status == GameStatus.LevelUpPause || r.Status == GameStatus.Paused);
    }

    public IEnumerable<Room> GetGameOverRooms()
    {
        return _rooms.Values.Where(r => r.Status == GameStatus.GameOver);
    }

    /// <summary>
    /// Register the player→room mapping (called after JoinGame adds the player to the room).
    /// </summary>
    public void RegisterPlayerRoom(string connectionId, string roomId)
    {
        _playerRoomMap.TryAdd(connectionId, roomId);
    }
}
