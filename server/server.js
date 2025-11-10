const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const RoomManager = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const roomManager = new RoomManager();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Assign color to user and send initial state
    const userColor = roomManager.assignUserColor(socket.id);
    const initialOperations = roomManager.getDrawingState();

    socket.emit('user-connected', {
        userId: socket.id,
        color: userColor,
        operations: initialOperations,
        userColors: roomManager.getAllUserColors()
    });

    // Notify other users about new connection
    socket.broadcast.emit('user-joined', {
        userId: socket.id,
        color: userColor,
        userColors: roomManager.getAllUserColors()
    });

    // Handle drawing operations
    socket.on('drawing-data', (data) => {
        const operation = roomManager.addDrawingOperation({
            ...data,
            userId: socket.id
        });

        // Broadcast to all other users
        socket.broadcast.emit('drawing-data', operation);
    });

    // Handle cursor movement
    socket.on('cursor-move', (data) => {
        socket.broadcast.emit('cursor-move', {
            ...data,
            userId: socket.id,
            color: userColor
        });
    });

    // Handle undo
    socket.on('undo', () => {
        const undoneOperation = roomManager.undo();
        if (undoneOperation) {
            io.emit('undo', {
                operationId: undoneOperation.id,
                userId: socket.id
            });
        }
    });

    // Handle redo
    socket.on('redo', () => {
        const redoneOperation = roomManager.redo();
        if (redoneOperation) {
            io.emit('redo', {
                operation: redoneOperation,
                userId: socket.id
            });
        }
    });

    // Handle clear
    socket.on('clear', () => {
        roomManager.clear();
        io.emit('clear', { userId: socket.id });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        roomManager.removeUser(socket.id);
        
        socket.broadcast.emit('user-left', {
            userId: socket.id,
            userColors: roomManager.getAllUserColors()
        });
    });

    // Handle ping for latency measurement
    socket.on('ping', (data) => {
        socket.emit('pong', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});

module.exports = { app, server, io, roomManager };