type MessageHandler = (data: any) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private roomId: string;
  private handlers: MessageHandler[] = [];
  private queue: any[] = [];
  private reconnectDelay = 1000;
  private maxDelay = 16000;
  private shouldReconnect = true;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(url: string, token: string, roomId: string) {
    this.url = url;
    this.token = token;
    this.roomId = roomId;
  }

  connect() {
    this.shouldReconnect = true;
    this._connect();
  }

  private _connect() {
    const wsUrl = `${this.url}?token=${this.token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("[WS] connected");
      this.reconnectDelay = 1000;

      // Join the room
      this._send({ type: "join_room", roomId: this.roomId });

      // Flush queued messages
      while (this.queue.length > 0) {
        const msg = this.queue.shift();
        this._send(msg);
      }

      // Start heartbeat
      this.pingInterval = setInterval(() => {
        this._send({ type: "ping" });
      }, 25000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong") return;
        this.handlers.forEach((h) => h(data));
      } catch {
        console.error("[WS] bad message", event.data);
      }
    };

    this.ws.onclose = () => {
      console.log("[WS] disconnected");
      this._clearPing();
      if (this.shouldReconnect) {
        console.log(`[WS] reconnecting in ${this.reconnectDelay}ms`);
        setTimeout(() => {
          this.reconnectDelay = Math.min(
            this.reconnectDelay * 2,
            this.maxDelay
          );
          this._connect();
        }, this.reconnectDelay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  sendShape(shape: any) {
    const msg = {
      type: "chat",
      roomId: this.roomId,
      message: JSON.stringify(shape),
    };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._send(msg);
    } else {
      // Buffer it — will flush on reconnect
      this.queue.push(msg);
    }
  }

  sendBackgroundChange(color: string) {
    const msg = {
      type: "background_change",
      roomId: this.roomId,
      color,
    };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._send(msg);
    } else {
      this.queue.push(msg);
    }
  }

  sendClearCanvas() {
    const msg = {
      type: "clear_canvas",
      roomId: this.roomId,
    };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._send(msg);
    } else {
      this.queue.push(msg);
    }
  }

  sendCursor(x: number, y: number, name: string, color: string) {
    const msg = {
      type: "cursor_move",
      roomId: this.roomId,
      x,
      y,
      name,
      color,
    };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._send(msg);
    }
  }

  sendDeleteShape(shapeId: string) {
    const msg = {
      type: "delete_shape",
      roomId: this.roomId,
      shapeId,
    };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._send(msg);
    } else {
      this.queue.push(msg);
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this._clearPing();
    this.ws?.close();
  }

  private _send(data: any) {
    this.ws?.send(JSON.stringify(data));
  }

  private _clearPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}