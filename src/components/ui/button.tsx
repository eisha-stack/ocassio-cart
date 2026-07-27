import type { ReactNode } from 'react';

// TODO: build a proper design-system Button (variants, sizes) once UI requirements are defined.
export function Button({ children }: { children: ReactNode }) {
  return <button className="rounded px-4 py-2">{children}</button>;
}
