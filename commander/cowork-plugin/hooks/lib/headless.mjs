/**
 * headless.mjs: may a hook ask for a picker (AskUserQuestion,
 * request_user_input)? Shared by the router, the Stop menu and the ambient
 * ticker, so they always agree.
 */
/**
 * True when nobody can answer a picker: CI, or CCC_HEADLESS=1 (set it for
 * fleet lanes, `claude -p` and `codex exec`). CCC_HEADLESS=0 forces
 * interactive. The entrypoint is not used: Remote Control and SDK sessions
 * report sdk-cli while a person still answers pickers. Headless routing
 * never asks for AskUserQuestion or request_user_input; it names the best
 * fitting skill instead.
 */
export function isHeadless(env = process.env) {
  const flag = String(env.CCC_HEADLESS || '').trim().toLowerCase();
  if (['1', 'true', 'on', 'yes'].includes(flag)) return true;
  if (['0', 'false', 'off', 'no'].includes(flag)) return false;
  return ['CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS'].some((k) => {
    const v = String(env[k] || '').trim().toLowerCase();
    return v !== '' && v !== '0' && v !== 'false';
  });
}
