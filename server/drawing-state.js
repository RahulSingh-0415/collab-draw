const { v4: uuidv4 } = require('uuid');

class DrawingState {
    constructor() {
        this.operations = [];
        this.undoStack = [];
        this.userColors = new Map();
        this.availableColors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
            '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
        ];
        this.nextColorIndex = 0;
    }

    assignUserColor(userId) {
        if (!this.userColors.has(userId)) {
            const color = this.availableColors[this.nextColorIndex % this.availableColors.length];
            this.userColors.set(userId, color);
            this.nextColorIndex++;
        }
        return this.userColors.get(userId);
    }

    addOperation(operation) {
        operation.id = uuidv4();
        operation.timestamp = Date.now();
        this.operations.push(operation);
        this.undoStack.length = 0; // Clear redo stack on new operation
        return operation;
    }

    undo() {
        if (this.operations.length > 0) {
            const operation = this.operations.pop();
            this.undoStack.push(operation);
            return operation;
        }
        return null;
    }

    redo() {
        if (this.undoStack.length > 0) {
            const operation = this.undoStack.pop();
            this.operations.push(operation);
            return operation;
        }
        return null;
    }

    getOperations() {
        return this.operations;
    }

    clear() {
        this.operations.length = 0;
        this.undoStack.length = 0;
    }

    removeUser(userId) {
        this.userColors.delete(userId);
    }

    getUserColor(userId) {
        return this.userColors.get(userId);
    }

    getAllUserColors() {
        return Object.fromEntries(this.userColors);
    }
}

module.exports = DrawingState;