class CollaborativeCanvasApp {
    constructor() {
        this.websocketManager = new WebSocketManager();
        this.drawingCanvas = new DrawingCanvas('drawing-canvas');
        this.initializeApp();
    }

    initializeApp() {
        // Make websocket manager globally available
        window.websocketManager = this.websocketManager;

        // Initialize WebSocket connection
        const socket = this.websocketManager.connect();
        
        // Set up WebSocket event handlers
        this.setupWebSocketHandlers(socket);
        
        // Set up UI event handlers
        this.setupUIHandlers();
        
        // Set up latency measurement
        this.setupLatencyMeasurement(socket);
    }

    setupWebSocketHandlers(socket) {
        // Handle initial connection
        socket.on('user-connected', (data) => {
            console.log('Connected to server', data);
            this.drawingCanvas.setUserInfo(data.userId, data.color);
            this.updateUserColor(data.color);
            this.updateUserCount(1); // Initial count
            
            // Load existing operations
            if (data.operations && data.operations.length > 0) {
                this.drawingCanvas.loadOperations(data.operations);
            }
            
            // Update users list
            this.updateUsersList(data.userColors);
        });

        // Handle user joined
        socket.on('user-joined', (data) => {
            console.log('User joined:', data.userId);
            this.updateUserCount('increment');
            this.updateUsersList(data.userColors);
        });

        // Handle user left
        socket.on('user-left', (data) => {
            console.log('User left:', data.userId);
            this.updateUserCount('decrement');
            this.drawingCanvas.removeCursor(data.userId);
            this.updateUsersList(data.userColors);
        });

        // Handle drawing data from other users
        socket.on('drawing-data', (data) => {
            this.drawingCanvas.drawRemote(data);
        });

        // Handle cursor movement from other users
        socket.on('cursor-move', (data) => {
            this.drawingCanvas.updateCursor(data.userId, data);
        });

        // Handle global undo
        socket.on('undo', (data) => {
            this.drawingCanvas.undo();
        });

        // Handle global redo
        socket.on('redo', (data) => {
            if (data.operation) {
                this.drawingCanvas.drawRemote(data.operation);
                this.drawingCanvas.localOperations.push(data.operation);
            }
        });

        // Handle clear
        socket.on('clear', (data) => {
            this.drawingCanvas.clearCanvas();
        });

        // Handle pong for latency measurement
        socket.on('pong', (data) => {
            const latency = Date.now() - data.timestamp;
            this.websocketManager.updateLatency(latency);
        });
    }

    setupUIHandlers() {
        // Tool selection
        document.querySelectorAll('.tool').forEach(tool => {
            tool.addEventListener('click', (e) => {
                document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.drawingCanvas.setTool(e.target.dataset.tool);
            });
        });

        // Brush size
        const brushSize = document.getElementById('brush-size');
        const sizeValue = document.getElementById('size-value');
        
        brushSize.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            sizeValue.textContent = `${size}px`;
            this.drawingCanvas.setBrushSize(size);
        });

        // Brush color
        const brushColor = document.getElementById('brush-color');
        brushColor.addEventListener('input', (e) => {
            this.drawingCanvas.setBrushColor(e.target.value);
        });

        // Color presets
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                this.drawingCanvas.setBrushColor(color);
                brushColor.value = color;
            });
        });

        // Undo/Redo/Clear buttons
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.drawingCanvas.undo();
            this.websocketManager.emit('undo');
        });

        document.getElementById('redo-btn').addEventListener('click', () => {
            this.drawingCanvas.redo();
            this.websocketManager.emit('redo');
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the canvas? This will clear for all users.')) {
                this.drawingCanvas.clearCanvas();
                this.websocketManager.emit('clear');
            }
        });
    }

    setupLatencyMeasurement(socket) {
        socket.on('pong', (data) => {
            const latency = Date.now() - data.timestamp;
            this.websocketManager.updateLatency(latency);
        });
    }

    updateUserColor(color) {
        const userColorElement = document.getElementById('user-color');
        if (userColorElement) {
            userColorElement.style.backgroundColor = color;
        }
    }

    updateUserCount(change) {
        const userCountElement = document.getElementById('user-count');
        if (userCountElement) {
            if (change === 'increment') {
                const current = parseInt(userCountElement.textContent) || 0;
                userCountElement.textContent = `${current + 1} users online`;
            } else if (change === 'decrement') {
                const current = parseInt(userCountElement.textContent) || 1;
                userCountElement.textContent = `${Math.max(1, current - 1)} users online`;
            } else {
                userCountElement.textContent = `${change} users online`;
            }
        }
    }

    updateUsersList(userColors) {
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '';
            
            Object.entries(userColors).forEach(([userId, color]) => {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                
                const colorIndicator = document.createElement('div');
                colorIndicator.className = 'user-color';
                colorIndicator.style.backgroundColor = color;
                
                const userIdText = document.createElement('span');
                userIdText.textContent = userId === this.drawingCanvas.userId ? 
                    'You' : `User ${userId.substring(0, 8)}`;
                
                userItem.appendChild(colorIndicator);
                userItem.appendChild(userIdText);
                usersList.appendChild(userItem);
            });
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CollaborativeCanvasApp();
});