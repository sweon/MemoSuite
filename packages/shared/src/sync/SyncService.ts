
import { encryptData, decryptData } from '../utils/crypto';
import type { SyncServiceOptions, SyncStatus } from './types';

export const cleanRoomId = (roomId: string): string => {
    return roomId.trim().replace(/[^a-zA-Z0-9_-]/g, '-').toUpperCase();
};

const RELAY_BASE = 'https://ntfy.sh';
const WS_BASE = 'wss://ntfy.sh';

export class SyncService {
    private options: SyncServiceOptions;
    private ws: WebSocket | null = null;
    private roomId: string | null = null;
    private isHost: boolean = false;
    private lastMessageId: string | null = null;
    private isSyncing: boolean = false;
    private isProcessing: boolean = false;
    private messageQueue: any[] = [];
    private instanceId: string = Math.random().toString(36).substring(2, 10);
    private hasSentInitialSync: boolean = false;
    private mergedExcludeIds: number[] = [];

    constructor(options: SyncServiceOptions) {
        this.options = options;
    }

    private setStatus(status: SyncStatus, message: string) {
        this.options.onStatusChange(status, message);
    }

    public async initialize(roomId: string): Promise<string> {
        this.isHost = true;
        this.roomId = cleanRoomId(roomId);

        await this.analyzeSyncData();

        this.setStatus('connecting', 'Connecting to relay server...');
        await this.connectRelay();

        this.setStatus('ready', `Room ID: ${this.roomId} - Waiting for peer...`);
        return this.roomId;
    }

    private async analyzeSyncData() {
        if (!this.options.onSyncInfo) return;

        try {
            const info = await this.options.adapter.analyzeSyncData(this.options.initialDataLogId);
            this.options.onSyncInfo(info);
        } catch (e) {
            console.error('Failed to analyze sync data', e);
        }
    }

    public async connect(targetRoomId: string) {
        this.isHost = false;
        this.roomId = cleanRoomId(targetRoomId);

        this.setStatus('connecting', 'Connecting to relay server...');
        await this.connectRelay();

        // Notify host that we are ready to receive
        console.log('Sending join message...');
        await this.sendRelayMessage({ type: 'join' });

        this.setStatus('connected', 'Found peer! Waiting for source data...');
    }

    private async connectRelay() {
        if (this.ws) {
            this.ws.close();
        }

        return new Promise<void>((resolve, reject) => {
            const url = `${WS_BASE}/${this.roomId}/ws`;
            const timeout = setTimeout(() => {
                if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
                    this.ws.close();
                    reject(new Error('Relay connection timeout'));
                }
            }, 10000);

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                clearTimeout(timeout);
                console.log('Relay connected');
                resolve();
            };

            this.ws.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.event === 'message') {
                        if (msg.id === this.lastMessageId) return;
                        this.lastMessageId = msg.id;

                        this.messageQueue.push(msg);
                        this.processQueue();
                    }
                } catch (e) {
                }
            };

            this.ws.onerror = (e) => {
                console.error('WebSocket error:', e);
                this.setStatus('error', 'Relay connection error');
            };

            this.ws.onclose = () => {
                console.log('Relay connection closed');
            };
        });
    }

    private async processQueue() {
        if (this.isProcessing || this.messageQueue.length === 0) return;

        this.isProcessing = true;
        const msg = this.messageQueue.shift();

        try {
            await this.handleRelayMessage(msg);
        } catch (e) {
            console.error('Message processing failed', e);
        } finally {
            this.isProcessing = false;
            this.processQueue();
        }
    }

    private async handleRelayMessage(msg: any) {
        if (msg.attachment) {
            if (msg.tags && msg.tags.includes(`inst_${this.instanceId}`)) {
                return;
            }
            await this.downloadAndProcessAttachment(msg.attachment.url);
            return;
        }

        let payload: any;
        try {
            payload = JSON.parse(msg.message);
        } catch (e) {
            return;
        }

        if (payload.instanceId === this.instanceId) {
            return;
        }

        switch (payload.type) {
            case 'join':
                if (this.isHost) {
                    this.setStatus('syncing', 'Peer joined! Packaging local data...');
                    // Host sends data first
                    setTimeout(() => this.syncData(), 500);
                }
                break;
            case 'sync_data':
                if (payload.data) {
                    await this.processReceivedEncodedData(payload.data);
                }
                break;
            case 'sync_complete_ack':
                if (!this.isHost) {
                    // Client received ACK from Host
                    console.log('Received ACK from Host, finalizing sync');
                    this.setStatus('completed', 'Sync completed! All data mirrored.');
                    this.options.onDataReceived();
                } else {
                    // Host received ACK from Client (unlikely in current flow but for safety)
                    console.log('Received ACK from Client');
                    this.setStatus('completed', 'Sync verified by peer.');
                    this.options.onDataReceived();
                }
                break;
        }
    }

    public async syncData() {
        if (!this.roomId || this.isSyncing) {
            return;
        }

        try {
            this.isSyncing = true;
            this.hasSentInitialSync = true;

            this.setStatus('syncing', 'Scanning items to share...');
            const targetLogIds = await this.options.adapter.getSyncTargetIds(this.options.initialDataLogId);

            this.setStatus('syncing', 'Syncing encrypted content...');
            const data = await this.options.adapter.getBackupData(targetLogIds, this.mergedExcludeIds);
            const jsonStr = JSON.stringify(data);
            const encrypted = await encryptData(jsonStr, this.roomId);
            const finalData = (targetLogIds ? "PARTIAL:" : "FULL:") + encrypted;

            if (finalData.length > 2000) {
                await this.sendRelayAttachment(finalData);
            } else {
                await this.sendRelayMessage({
                    type: 'sync_data',
                    data: finalData
                });
            }

            if (this.options.initialDataLogId) {
                // One-way share
                this.setStatus('completed', 'Item shared successfully!');
                this.options.onDataReceived();
            } else {
                // Bi-directional wait
                if (this.isHost) {
                    this.setStatus('syncing', 'Data sent! Waiting for peer updates...');
                } else {
                    this.setStatus('syncing', 'Local changes sent! Waiting for verification...');
                }
            }
        } catch (err: any) {
            console.error('Sync failed:', err);
            this.setStatus('error', `Sync error: ${err.message}`);
        } finally {
            this.isSyncing = false;
        }
    }

    private async sendRelayAttachment(encryptedData: string) {
        if (!this.roomId) return;
        const tags = [this.isHost ? 'host' : 'client', `inst_${this.instanceId}`];

        await fetch(`${RELAY_BASE}/${this.roomId}`, {
            method: 'PUT',
            body: encryptedData,
            headers: {
                'Filename': 'sync.enc',
                'Tags': tags.join(',')
            }
        });
    }

    private async sendRelayMessage(payload: any) {
        if (!this.roomId) return;
        payload.instanceId = this.instanceId;
        const message = JSON.stringify(payload);

        await fetch(`${RELAY_BASE}/${this.roomId}`, {
            method: 'POST',
            body: message
        });
    }

    private async downloadAndProcessAttachment(url: string) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Download failed');
            const encodedData = await response.text();
            await this.processReceivedEncodedData(encodedData);
        } catch (err: any) {
            this.setStatus('error', `Download error: ${err.message}`);
        }
    }

    private async processReceivedEncodedData(encodedData: string) {
        let isPartial = false;
        let realEncodedData = encodedData;

        if (encodedData.startsWith("PARTIAL:")) {
            isPartial = true;
            realEncodedData = encodedData.substring(8);
        } else if (encodedData.startsWith("FULL:")) {
            isPartial = false;
            realEncodedData = encodedData.substring(5);
        }

        let decrypted = '';
        try {
            this.setStatus('syncing', 'Decrypting package...');
            decrypted = await decryptData(realEncodedData, this.roomId!);
        } catch (e: any) {
            this.setStatus('error', 'Decryption failed. Check room ID.');
            return;
        }

        let data: any;
        try {
            data = JSON.parse(decrypted);
            this.updateSyncInfoMeta(data, isPartial);
        } catch (e: any) {
            this.setStatus('error', 'Data parsing failed.');
            return;
        }

        try {
            this.setStatus('merging', 'Merging database changes...');
            const excludeIds = await this.options.adapter.mergeBackupData(data, this.options.onConflict);
            if (Array.isArray(excludeIds)) {
                this.mergedExcludeIds = excludeIds;
            }

            if (this.isHost) {
                // Host received data from Client (Final step of sequence)
                console.log('Host merged client data. Sending ACK and finalizing.');
                await this.sendRelayMessage({ type: 'sync_complete_ack' });
                this.setStatus('completed', 'Sync completed! Exchange verified.');
                this.options.onDataReceived();
            } else {
                // Client received data from Host
                if (!isPartial) {
                    if (!this.hasSentInitialSync) {
                        console.log('Client merged host data. Sending local updates back.');
                        // Send data back to Host
                        await this.syncData();
                    } else {
                        // We already sent our data, now we just wait for the Host's ACK
                        // Do NOT reload yet.
                        console.log('Client already sent data. Waiting for host verification.');
                    }
                } else {
                    // One-way share received
                    this.setStatus('completed', 'Item received successfully!');
                    this.options.onDataReceived();
                }
            }
        } catch (err: any) {
            this.setStatus('error', `Merge error: ${err.message}`);
        }
    }

    private updateSyncInfoMeta(data: any, isPartial: boolean) {
        if (!this.options.onSyncInfo) return;

        let count = 0;
        let label = 'Remote items';

        if (data.memos && Array.isArray(data.memos)) {
            count = data.memos.length;
            label = data.memos[0]?.title || 'Combined Memos';
        } else if (data.logs && Array.isArray(data.logs)) {
            count = data.logs.length;
            label = data.logs[0]?.title || 'Combined Logs';
        } else if (data.words && Array.isArray(data.words)) {
            count = data.words.length;
            label = data.words[0]?.title || 'Combined Words';
        }

        if (!isPartial) {
            this.options.onSyncInfo({ type: 'full', count: count || 0, label: 'Full Sync Payload' });
        } else {
            this.options.onSyncInfo({ type: count > 1 ? 'thread' : 'single', count: count, label: label });
        }
    }

    public destroy() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.roomId = null;
    }
}
