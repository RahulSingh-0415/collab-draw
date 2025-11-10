class WebSocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.latency = null;
        this.pingInterval = null;
    }

    connect() {
        this.socket = io();

        this.socket.on('connect', () => {
            this.isConnected = true;
            this.updateConnectionStatus('connected');
            this.startLatencyMeasurement();
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.updateConnectionStatus('disconnected');
            this.stopLatencyMeasurement();
        });

        return this.socket;
    }

    startLatencyMeasurement() {
        this.pingInterval = setInterval(() => {
            const startTime = Date.now();
            this.socket.emit('ping', { timestamp: startTime });
        }, 1000);
    }

    stopLatencyMeasurement() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = status === 'connected' ? '🟢 Connected' : '🔴 Disconnected';
            statusElement.className = status;
        }
    }

    updateLatency(latency) {
        this.latency = latency;
        const latencyElement = document.getElementById('latency-display');
        if (latencyElement) {
            latencyElement.textContent = `Latency: ${latency}ms`;
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.stopLatencyMeasurement();
        }
    }
}