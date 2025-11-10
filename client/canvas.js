class DrawingCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentTool = 'brush';
        this.brushSize = 5;
        this.brushColor = '#000000';
        this.userId = null;
        this.userColor = null;
        
        this.localOperations = [];
        this.undoStack = [];
        
        this.otherUsersCursors = new Map();
        
        this.initializeCanvas();
        this.setupEventListeners();
    }

    initializeCanvas() {
        // Set canvas background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set line properties
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Prevent scrolling when touching canvas
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault());
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault());
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        [this.lastX, this.lastY] = [pos.x, pos.y];
        
        // Start new path
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
    }

    draw(e) {
        if (!this.isDrawing) {
            this.sendCursorPosition(e);
            return;
        }

        const pos = this.getMousePos(e);
        const currentX = pos.x;
        const currentY = pos.y;

        // Draw locally
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';

        if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.brushColor;
        }

        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();

        // Create drawing data
        const drawingData = {
            type: 'draw',
            tool: this.currentTool,
            points: [
                { x: this.lastX, y: this.lastY },
                { x: currentX, y: currentY }
            ],
            size: this.brushSize,
            color: this.brushColor,
            compositeOperation: this.ctx.globalCompositeOperation
        };

        // Store locally for undo/redo
        this.localOperations.push({
            ...drawingData,
            timestamp: Date.now()
        });

        // Send to server
        if (window.websocketManager) {
            window.websocketManager.emit('drawing-data', drawingData);
        }

        [this.lastX, this.lastY] = [currentX, currentY];
    }

    stopDrawing() {
        this.isDrawing = false;
        this.ctx.closePath();
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.canvas.dispatchEvent(mouseEvent);
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        let clientX, clientY;
        
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    sendCursorPosition(e) {
        if (!window.websocketManager) return;
        
        const pos = this.getMousePos(e);
        window.websocketManager.emit('cursor-move', {
            x: pos.x,
            y: pos.y
        });
    }

    drawRemote(data) {
        const { points, tool, size, color, compositeOperation } = data;
        
        this.ctx.save();
        this.ctx.lineWidth = size;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.globalCompositeOperation = compositeOperation;
        this.ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;

        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        this.ctx.lineTo(points[1].x, points[1].y);
        this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.restore();
    }

    updateCursor(userId, data) {
        let cursor = this.otherUsersCursors.get(userId);
        const cursorsContainer = document.getElementById('cursors-container');
        
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'user-cursor';
            cursor.id = `cursor-${userId}`;
            cursorsContainer.appendChild(cursor);
            this.otherUsersCursors.set(userId, cursor);
        }
        
        cursor.style.left = `${data.x}px`;
        cursor.style.top = `${data.y}px`;
        cursor.style.borderColor = data.color;
        cursor.style.backgroundColor = data.color + '40'; // Add transparency
    }

    removeCursor(userId) {
        const cursor = this.otherUsersCursors.get(userId);
        if (cursor) {
            cursor.remove();
            this.otherUsersCursors.delete(userId);
        }
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    setBrushSize(size) {
        this.brushSize = size;
    }

    setBrushColor(color) {
        this.brushColor = color;
    }

    undo() {
        if (this.localOperations.length > 0) {
            const lastOp = this.localOperations.pop();
            this.undoStack.push(lastOp);
            this.redrawCanvas();
        }
    }

    redo() {
        if (this.undoStack.length > 0) {
            const lastUndone = this.undoStack.pop();
            this.localOperations.push(lastUndone);
            this.redrawCanvas();
        }
    }

    redrawCanvas() {
        // Clear canvas
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all operations
        this.localOperations.forEach(op => {
            this.drawRemote(op);
        });
    }

    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.localOperations.length = 0;
        this.undoStack.length = 0;
    }

    loadOperations(operations) {
        this.localOperations = operations;
        this.redrawCanvas();
    }

    setUserInfo(userId, color) {
        this.userId = userId;
        this.userColor = color;
    }
}