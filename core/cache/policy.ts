/** Cache classes are deliberately explicit so a caller cannot accidentally cache transactional state. */
export const CACHE_POLICY = {
  jobsDiscover: { scope: "jobs", ttlSec: 120, staleSec: 600 },
  publicProject: { scope: "project", ttlSec: 6 * 3600, staleSec: 0 },
  externalContent: { scope: "external-content", ttlSec: 60 * 24 * 3600, staleSec: 24 * 3600 },
  catalogue: { scope: "catalogue", ttlSec: 24 * 3600, staleSec: 24 * 3600 },
} as const;

export type CachePolicy = (typeof CACHE_POLICY)[keyof typeof CACHE_POLICY];
