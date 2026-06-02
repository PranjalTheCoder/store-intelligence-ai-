export const isMockMode = import.meta.env.VITE_USE_MOCK === "true";

/**
 * Simulates network latency for mock data responses.
 */
export const withMockDelay = <T>(data: T, ms: number = 500): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
};
