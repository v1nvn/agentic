import p1 from '../assets/payloads/p1.json' with { type: 'json' };
import p2 from '../assets/payloads/p2.json' with { type: 'json' };
import p3 from '../assets/payloads/p3.json' with { type: 'json' };
import p4 from '../assets/payloads/p4.json' with { type: 'json' };

const PAYLOADS = { p1, p2, p3, p4 } as const;

export type PayloadName = keyof typeof PAYLOADS;

export const PAYLOAD_NAMES: readonly PayloadName[] = ['p1', 'p2', 'p3', 'p4'];

export function payloadJson(name: PayloadName): string {
  return JSON.stringify(PAYLOADS[name]);
}
