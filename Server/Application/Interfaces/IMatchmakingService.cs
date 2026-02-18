using Domain.Entities;

namespace Application.Interfaces;

public interface IMatchmakingService
{
    (Room Room, bool IsNew) FindOrCreateRoom();
    void RemovePlayer(string connectionId);
    Room? GetRoom(string roomId);
    Room? GetRoomByPlayer(string connectionId);
    IEnumerable<Room> GetAllActiveRooms();
}
