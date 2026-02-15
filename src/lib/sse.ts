import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  rooms: string[];
}

class SSEManager {
  private clients: SSEClient[] = [];

  /**
   * Add a new SSE client
   */
  addClient(id: string, res: Response, rooms: string[]) {
    // Everyone joins the public room
    const allRooms = ['public', ...rooms];
    const newClient: SSEClient = { id, res, rooms: allRooms };
    this.clients.push(newClient);

    // Initial SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for Nginx/Proxies
    
    res.status(200);
    res.flushHeaders(); // Send headers immediately

    // Send a message to confirm connection
    this.sendToClient(newClient, 'connected', { status: 'ok', id });

    // Remove client on connection close
    res.on('close', () => {
      this.removeClient(id);
    });

    console.log(`📡 SSE Client connected: ${id} (Rooms: ${rooms.join(', ')})`);
  }

  /**
   * Remove an SSE client
   */
  removeClient(id: string) {
    this.clients = this.clients.filter(client => client.id !== id);
    console.log(`📡 SSE Client disconnected: ${id}`);
  }

  /**
   * Send an event to a specific client
   */
  private sendToClient(client: SSEClient, event: string, data: any) {
    client.res.write(`event: ${event}\n`);
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    
    // If using compression middleware, we need to flush
    if ((client.res as any).flush) {
      (client.res as any).flush();
    }
  }

  /**
   * Broadcast an event to one or more rooms
   */
  broadcast(rooms: string | string[], event: string, data: any) {
    const targetRooms = Array.isArray(rooms) ? rooms : [rooms];
    
    this.clients.forEach(client => {
      const isInRoom = client.rooms.some(room => targetRooms.includes(room));
      if (isInRoom) {
        this.sendToClient(client, event, data);
      }
    });

    console.log(`📡 SSE Broadcast: [${event}] to rooms [${targetRooms.join(', ')}]`);
  }

  /**
   * Send heartbeat to all clients to keep connections alive
   */
  heartbeat() {
    this.clients.forEach(client => {
      client.res.write(': heartbeat\n\n');
      if ((client.res as any).flush) {
        (client.res as any).flush();
      }
    });
  }
}

const sseManager = new SSEManager();

// Set up heartbeat interval (every 30 seconds)
setInterval(() => {
  sseManager.heartbeat();
}, 30000);

export default sseManager;
