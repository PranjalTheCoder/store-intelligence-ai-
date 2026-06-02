import { apiClient } from '../apiClient';
import { isMockMode, withMockDelay } from '../mockHelper';
import { LiveEvent, SystemAlert } from '@/types';
import { getMockEvents, getMockAlerts } from '../mockData';

export const EventsService = {
  getEvents: async (): Promise<LiveEvent[]> => {
    if (isMockMode) {
      return withMockDelay(getMockEvents(), 300);
    }
    return apiClient.get('/events');
  },

  getAlerts: async (): Promise<SystemAlert[]> => {
    if (isMockMode) {
      return withMockDelay(getMockAlerts(), 400);
    }
    return apiClient.get('/alerts');
  }
};