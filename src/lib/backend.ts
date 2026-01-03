import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';

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
let backend: any = null;
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
  return client.isAuthenticated();
}

export async function getAgent(): Promise<HttpAgent> {
  if (agent) return agent;

  const client = await initAuth();
  const identity = client.getIdentity();

  agent = new HttpAgent({
    host: HOST,
    identity,
  });

  if (DFX_NETWORK === 'local') {
    await agent.fetchRootKey();
  }

  return agent;
}

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
