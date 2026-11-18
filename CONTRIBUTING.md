# Contributing to NEXUS: CHAOS ENGINE

Thanks for helping improve NEXUS. This project values clarity, reproducibility and engineering honesty over feature count.

## Ground rules

- Keep the application client-only. Do not add a backend, paid API, AI service or telemetry.
- Do not introduce unseeded randomness into the simulation. Reproducibility is a core feature.
- Do not present modelled values as measurements. Keep disclaimers intact and specific.
- Every simulation rule must be documented in `docs/MODEL.md` and reflected in the in-app documentation.
- Prefer editing existing modules over creating parallel abstractions.

## Development setup

```bash
npm install
npm run dev
npm test
npm run build
```

Node.js 18+ is required. No environment variables or service credentials are needed.

## Before opening a pull request

1. Run `npm test` and make sure all tests pass.
2. Run `npm run build` and confirm there are no errors.
3. Check the interface at 1440px, 1280px, 768px and 390px widths.
4. Confirm every control you touched still changes real state (no placeholder buttons).
5. Update `README.md`, `docs/MODEL.md`, `docs/ARCHITECTURE.md` or `DocsView` if behaviour, parameters or architecture changed.
6. Keep the visual language consistent with the existing design tokens in `src/styles.css`.

## Model changes

Any change to the simulation must include:

- a short written explanation of the rule and its assumptions;
- updated equations in `docs/MODEL.md` and `src/views/DocsView.jsx`;
- parameter table updates if defaults change;
- tests for normal operation, boundary conditions, determinism and loop safety;
- a note in the PR describing the behavioural impact on the example scenarios.

Do not tune parameters only to produce a dramatic graph. Explain the rationale and mark values as illustrative.

## Code style

- JavaScript ES modules; functional React components and hooks.
- Two-space indentation, single quotes, semicolons.
- Pure functions for simulation logic; no DOM or storage access in `src/simulation/`.
- Keep derived values derived. Do not duplicate simulation state in React state.
- CSS follows the existing token system, 4px spacing scale and restrained accent usage.
- Accessible names and `aria-*` attributes are required for icon-only controls and toggles.
- Respect `prefers-reduced-motion`; animations must communicate state, not decorate.

## Adding a system

1. Add a definition and graph position to `src/data/systems.js`.
2. Add incoming/outgoing edges to `src/data/dependencies.js` with a documented rationale.
3. Verify the graph layout remains readable and update `DependencyGraph` spacing if needed.
4. Add a test asserting graph integrity and basic propagation.
5. Update the parameter tables in `docs/MODEL.md` and `README.md` where relevant.

## Adding a scenario

Add an entry to `src/data/scenarios.js` with a name, source system, initial capacity, horizon and an honest description. Confirm it is reproducible by running the existing scenario test.

## Reporting bugs

Include:

- steps to reproduce;
- expected and observed behaviour;
- browser and Node versions;
- the scenario configuration (source, capacity, horizon) and current tick;
- whether any operator restore action was taken.

For simulation discrepancies, include the affected system and the tick at which the values diverged, plus the edge effects shown in the inspector.

## Scope

In scope: model clarity, deterministic behaviour, interface usability, accessibility, responsive layout, documentation, tests, import/export, sensitivity analysis.

Out of scope without prior discussion: live data feeds, operational forecasting claims, multiplayer/accounts, backend services, paid dependencies, decorative visual effects.

## License

By contributing, you agree that your contribution is licensed under the MIT License in `LICENSE`.
