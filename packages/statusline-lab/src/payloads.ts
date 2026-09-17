import p1 from '../assets/payloads/p1.json' with { type: 'json' };
import p2 from '../assets/payloads/p2.json' with { type: 'json' };
import p3 from '../assets/payloads/p3.json' with { type: 'json' };
import p4 from '../assets/payloads/p4.json' with { type: 'json' };

const PAYLOADS = { p1, p2, p3, p4 } as const;

type PayloadName = keyof typeof PAYLOADS;

export function payloadJson(name: string): string | undefined {
  return Object.hasOwn(PAYLOADS, name)
    ? JSON.stringify(PAYLOADS[name as PayloadName])
    : undefined;
}
