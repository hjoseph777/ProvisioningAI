import { createStore } from 'zustand';
import { Doc } from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import { INITIAL_NODES } from '../initialNodes';
import {
  createConnectionSlice,
  type ConnectionSlice,
} from './connection-slice';
import { createCursorSlice, type CursorSlice } from './cursor-slice';
import { createFlowSlice, type FlowSlice } from './flow-slice';
import type { AppState } from '../types';

const ALL_COLORS = [
  '#DA702C',
  '#D0A215',
  '#879A39',
  '#3AA99F',
  '#4385BE',
  '#D14D41',
  '#8B7EC8',
  '#CE5D97',
];

export interface Store
  extends ConnectionSlice, CursorSlice, FlowSlice, AppState {
  yDoc?: Doc;
}

const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL;

export const store = createStore<Store>((set, get, store) => {
  const colorMap = new Map<string, string>();
  let colorIndex = Math.floor(Math.random() * ALL_COLORS.length);

  let provider: WebsocketProvider | undefined;

  function disconnect() {
    get().yDoc?.destroy();

    if (provider) {
      provider.destroy();
      provider = undefined;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('flow');

    window.history.replaceState({}, '', url);

    set({ yDoc: undefined, activeFlowId: undefined });
  }

  async function connect(newFlowId: string) {
    disconnect();
    if (!websocketUrl) {
      throw new Error(
        'Could not connect to Yjs server. `VITE_WEBSOCKET_URL` environment variable is not set',
      );
    }

    const newYDoc = new Doc();

    provider = new WebsocketProvider(websocketUrl, newFlowId, newYDoc);

    await new Promise((resolve, reject) => {
      provider!.once('sync', () => {
        resolve(true);
      });
      provider!.once('connection-error', (error) => {
        reject(error);
      });
    });

    const roomExists = newYDoc.getMap('meta').get('initialized');

    const url = new URL(window.location.href);
    url.searchParams.set('flow', newFlowId);
    window.history.replaceState({}, '', url);
    set({ yDoc: newYDoc, activeFlowId: newFlowId });

    if (!roomExists) {
      for (const node of INITIAL_NODES) {
        get().addNode(node);
      }
      newYDoc.getMap('meta').set('initialized', true);
    }
  }

  return {
    activeFlowId: undefined,
    userId: undefined,
    isLoading: false,
    error: null,
    setActiveFlowId: (activeFlowId: string) => {
      connect(activeFlowId);
    },
    setUserId: (userId: string | null) => set({ userId }),
    getUserColor: (userId: string) => {
      if (!colorMap.has(userId)) {
        colorMap.set(userId, ALL_COLORS[colorIndex++ % ALL_COLORS.length]);
      }
      return colorMap.get(userId)!;
    },
    joinFlow: async (flowId: string) => {
      set({ isLoading: true });
      try {
        await connect(flowId);
      } catch (error) {
        set({ error: 'Error joining flow' });
      } finally {
        set({ isLoading: false });
      }
    },
    createFlow: async () => {
      const activeFlowId = crypto.randomUUID();
      try {
        await connect(activeFlowId);
      } catch (error) {
        set({ error: 'Error creating flow' });
      } finally {
        set({ isLoading: false });
      }
    },
    exitFlow: () => {
      disconnect();
    },
    ...createFlowSlice(set, get, store),
    ...createConnectionSlice(set, get, store),
    ...createCursorSlice(set, get, store),
  };
});
