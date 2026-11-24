# Netlify build skip (netlify.toml `[build] ignore`)

Netlify skips a deploy only when a merge changes nothing but excluded files (markdown, plus repo-specific paths listed in `netlify.toml`). This saves Netlify credits on house-rule and docs merges.

The rule builds the site when any of these hold:
- `CACHED_COMMIT_REF` is empty or equal to `COMMIT_REF` (no usable cache, or a redeploy);
- the commit itself (`HEAD^..HEAD`) changes a non-excluded file;
- the range since the last cached build changes a non-excluded file;
- git fails (for example a missing ref).

**History:** the first version (28.10.2026, backlog #364) compared only `CACHED_COMMIT_REF..COMMIT_REF`. Netlify can set the cached ref to the PR's deploy preview, whose tree is identical to the squash merge. That cancelled real code merges ("Canceled build due to no content change") until the fix on 24.11.2026.

To force a deploy by hand: `POST https://api.netlify.com/api/v1/sites/<site id>/builds` with the Netlify token.
