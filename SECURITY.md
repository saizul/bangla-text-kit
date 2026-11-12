# Security policy

## Supported versions

Only the latest release receives fixes.

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Use GitHub's
private vulnerability reporting ("Report a vulnerability" under the
repository's **Security** tab). You will get an answer within a week.

## Scope

bangla-text-kit is a pure text-processing library with no runtime
dependencies, no network access and no file system access. The issues that
matter most are:

- **Denial of service.** Inputs that make a function take far longer than
  linear time, for example catastrophic regular expression backtracking.
  Please include the input length and timing.
- **Normalization bypasses.** Two strings that look identical but normalize
  or fold differently, if you rely on `normalize()` or `fold()` to compare
  user names, slugs or search keys. Note that `fold()` is lossy by design
  and is not meant for security decisions such as uniqueness checks of
  account names.

When you use the library to build identifiers (usernames, slugs), normalize
first, then apply your own allow-list of characters.
