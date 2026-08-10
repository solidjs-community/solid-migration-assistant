# Solid migration analyzer language

Use these terms for the current experimental preview.

**Detection**

One exact source location matched by a supported rule. A detection does not claim that the entire application was analyzed for every Solid 2 change.

**Guidance string**

A location-bearing terminal message containing a rule ID, the migration reason, a recommended investigation path, and explicit stop conditions. Each detected site produces exactly one plain string.

**Read-only analysis**

The analyzer inspects the selected target and prints guidance. It does not edit source, configuration, dependencies, or Git state, and it does not generate persistent artifacts.

**Coverage boundary**

The exact language, syntax, project profile, and direct-import shapes supported by the registered rules. Unsupported shapes remain outside the preview rather than being assigned a confidence level or category.

**Target contract**

The pinned Solid version and upstream source commit used to define the rules. The current implementation targets `solid-js@2.0.0-beta.30` at `edb3e36faad698d0368d5eade19e4cb3b5d5cf10`.

**Roadmap item**

A possible future capability that has no executable implementation in this preview. Automated transforms are roadmap-only.
