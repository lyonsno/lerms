import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';

export const STABLE_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function resolveBrowserExecutable({ explicit, env = process.env, candidates = [] } = {}) {
  const requested = explicit ?? env.KAMINOS_CHROME ?? env.WET_BORDER_CHROME;
  const search = requested ? [requested] : candidates;
  for (const executable of search) {
    if (executable && await isExecutable(executable)) {
      if (!requested && executable === STABLE_CHROME) continue;
      return { requested: requested ?? null, effective: executable, source: requested ? 'explicit_override' : 'independent_artifact' };
    }
  }
  throw new Error(JSON.stringify({
    schema: 'lerms.hill-of-hills.portable-macro-optical-browser-failure.v1',
    phase: 'resolve_executable',
    reason: requested ? 'requested_executable_missing' : 'independent_browser_artifact_missing',
    requested: requested ?? null,
    stableChromeRejected: true
  }));
}

export function allocateDebugPort() {
  return 0;
}

export function createLaunchReceipt({ resolution, requestedUrl, profileDirectory, debugPort }) {
  return {
    schema: 'lerms.hill-of-hills.portable-macro-optical-browser-launch.v1',
    launchId: randomUUID(),
    requestedExecutable: resolution.requested,
    effectiveExecutable: resolution.effective,
    executableSource: resolution.source,
    requestedUrl,
    profileDirectory,
    requestedDebugPort: debugPort,
    effectiveDebugPort: null,
    status: 'launching'
  };
}

export async function writeFailureReceipt(outputDirectory, failure, name = 'browser-failure-receipt.json') {
  await mkdir(outputDirectory, { recursive: true });
  const path = `${outputDirectory}/${name}`;
  await writeFile(path, `${JSON.stringify({
    schema: 'lerms.hill-of-hills.portable-macro-optical-browser-failure.v1',
    status: 'failed_before_primary_output',
    ...failure
  }, null, 2)}\n`);
  return path;
}

export async function isExecutable(path) {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
