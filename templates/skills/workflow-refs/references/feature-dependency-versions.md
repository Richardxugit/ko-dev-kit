# ko-feature reference: dependency version check

Loaded by `/ko-feature` during plan writing, before writing test or implementation code that uses
project dependencies.

Check the installed versions of key libraries (`package.json` dependencies). Use the project's
actual API, not the latest API. Common mismatches:

- Apollo Client v3 vs v4
- MUI v5 vs v6
- NestJS major versions
- React Testing Library
- Nx version (affects generator flags)
