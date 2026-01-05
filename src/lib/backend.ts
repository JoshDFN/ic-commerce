import { Actor, HttpAgent } from '@icp-sdk/core/agent';
import { AuthClient } from '@icp-sdk/auth/client';

// Import the generated declarations after running dfx generate
// For now, we'll create a manual interface

const BACKEND_CANISTER_ID = import.meta.env.VITE_CANISTER_ID_BACKEND || '';
const II_CANISTER_ID = import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY || 'rdmx6-jaaaa-aaaaa-aaadq-cai';
const DFX_NETWORK = import.meta.env.VITE_DFX_NETWORK || 'local';

const HOST = DFX_NETWORK === 'local'
  ? 'http://localhost:4943'
  : 'https://ic0.app';

import { idlFactory } from '../declarations/backend/backend.did.js';
// Note: _SERVICE type would require converting all components to use Candid's [] | [T]
// pattern for optionals instead of T | null
// import type { _SERVICE } from '../declarations/backend/backend.did.d';

let agent: HttpAgent | null = null;
// TODO: Use generated _SERVICE type when Candid optional patterns are standardized across codebase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let backend: ReturnType<typeof Actor.createActor> | null = null;
let authClient: AuthClient | null = null;

export async function initAuth(): Promise<AuthClient> {
  if (!authClient) {
    authClient = await AuthClient.create();
  }
  return authClient;
}

export async function login(): Promise<boolean> {
  const client = await initAuth();

  return new Promise((resolve) => {
    client.login({
      identityProvider: DFX_NETWORK === 'local'
        ? `http://${II_CANISTER_ID}.localhost:4943`
        : `https://identity.ic0.app`,
      onSuccess: () => {
        agent = null; // Reset agent to use new identity
        backend = null;
        resolve(true);
      },
      onError: () => resolve(false),
    });
  });
}

export async function logout(): Promise<void> {
  const client = await initAuth();
  await client.logout();
  agent = null;
  backend = null;
}

export async function isAuthenticated(): Promise<boolean> {
  const client = await initAuth();
  const authenticated = await client.isAuthenticated();

  if (authenticated && DFX_NETWORK === 'local') {
    // For local development, check if this is a stale session from a previous replica
    // by comparing the stored backend canister ID with the current one
    const storedBackendId = localStorage.getItem('ic-commerce-backend-id');
    if (storedBackendId && storedBackendId !== BACKEND_CANISTER_ID) {
      // Canister ID changed - replica was restarted, clear stale auth
      console.log('Detected replica restart (canister ID changed), clearing stale auth');
      await clearAuthCache();
      localStorage.setItem('ic-commerce-backend-id', BACKEND_CANISTER_ID);
      return false;
    }
    // Store current backend ID for future comparison
    localStorage.setItem('ic-commerce-backend-id', BACKEND_CANISTER_ID);
  }

  return authenticated;
}

/**
 * Clear cached auth state - useful when II state becomes stale
 * (e.g., after dfx start --clean wipes local II anchors)
 */
export async function clearAuthCache(): Promise<void> {
  try {
    const client = await initAuth();
    await client.logout();
  } catch {
    // Ignore errors during cleanup
  }
  agent = null;
  backend = null;
  authClient = null;
  // Clear stored backend ID so next login stores fresh value
  localStorage.removeItem('ic-commerce-backend-id');
}

export async function getAgent(): Promise<HttpAgent> {
  if (agent) return agent;

  const client = await initAuth();
  const identity = client.getIdentity();

  const isLocal = DFX_NETWORK === 'local';

  // Use the static create method for proper async initialization
  agent = await HttpAgent.create({
    host: HOST,
    identity,
    // For local development, fetch root key automatically and disable query signature verification
    // (local replica doesn't have the same certificate chain as mainnet)
    shouldFetchRootKey: isLocal,
    verifyQuerySignatures: !isLocal,
  });

  return agent;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBackend(): Promise<any> {
  if (backend) return backend;

  const agentInstance = await getAgent();
  backend = Actor.createActor(idlFactory, {
    agent: agentInstance,
    canisterId: BACKEND_CANISTER_ID,
  });

  return backend;
}

// Force recreate backend actor (useful after declarations change)
export function clearBackendCache(): void {
  backend = null;
  agent = null;
}

// Helper to format cents to dollars
export function formatPrice(cents: bigint | number): string {
  const amount = Number(cents) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Helper to format date
export function formatDate(timestamp: bigint | number): string {
  const date = new Date(Number(timestamp) / 1_000_000); // nanoseconds to ms
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Unwrap Candid optional type ([] | [T]) to plain T | null
 * Candid represents optional values as empty array [] for None
 * and single-element array [value] for Some(value)
 */
export function unwrapOpt<T>(opt: [] | [T] | T | null | undefined): T | null {
  if (opt === null || opt === undefined) return null;
  if (Array.isArray(opt)) {
    return opt.length > 0 ? (opt[0] ?? null) : null;
  }
  return opt as T;
}
