import { useState } from 'react';
import type { Scenario } from '../../../shared/types.js';
import defaultScenario from '../../../scenarios/default.json';

// Stack Buddy ships as a static site (GitHub Pages). The default scenario is
// bundled directly into the JS at build time — no backend, no fetch, no API.
// `slug` is preserved as a parameter for forward compatibility, but every
// instance returns the same bundled default. A user who wants to load custom
// scenarios from disk should clone the repo and build it themselves.
const BUNDLED_DEFAULT = defaultScenario as unknown as Scenario;

export function useScenario(_slug: string) {
  const [scenario] = useState<Scenario>(BUNDLED_DEFAULT);

  return {
    scenario,
    loading: false,
    error: null as string | null,
  };
}
