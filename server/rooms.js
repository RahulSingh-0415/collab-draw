class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.defaultRoomId = 'default';
        this.initializeDefaultRoom();
    }

    initializeDefaultRoom() {
        const DrawingState = require('./drawing-state');
        this.rooms.set(this.defaultRoomId, new DrawingState());
    }

    getRoom(roomId = this.defaultRoomId) {
        if (!this.rooms.has(roomId)) {
            const DrawingState = require('./drawing-state');
            this.rooms.set(roomId, new DrawingState());
        }
        return this.rooms.get(roomId);
    }

    assignUserColor(userId, roomId = this.defaultRoomId) {
        const room = this.getRoom(roomId);
        return room.assignUserColor(userId);
    }

    addDrawingOperation(operation, roomId = this.defaultRoomId) {
        const room = this.getRoom(roomId);
        return room.addOperation(operation);
    }

    undo(roomId = this.defaultRoomId) {
        const room = this.getRoom(roomId);
        return room.undo();
    }

    redo(roomId = this.defaultRoomId) {
        const room = this.getRoom(roomId);
        return room.redo();
    }

    clear(roomId = this.defaultRoomId) {
        const room = this.getRoom(roomId);
        room.clear();
    }

    getDrawingState(roomId = this.defaultRoomId) {
        const room = this.getRoom(roomId);
        return room.getOperations();
    }

    removeUser(userId, roomId = this.defaultRoomId) {
        const room = this.getRoom(roomId);
        room.removeUser(userId);
    }

    getUserColor(userId, roomId = this.defaultRoomId) {
        const room = this.getRoom(roomId);
        return room.getUserColor(userId);
    }

    getAllUserColors(roomId = this.defaultRoomId) {
        const room = this.getRoom(roomId);
        return room.getAllUserColors();
    }
}

module.exports = RoomManager;