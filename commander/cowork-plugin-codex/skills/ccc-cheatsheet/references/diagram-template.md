# Cheatsheet diagram template

Shape of the Mermaid map `/ccc-cheatsheet` renders. Every node below is an example: build the real nodes from the menu files and the workflows directory read in the same turn. A choice in a menu file becomes a node; a choice that is absent from the file is not drawn.

Mapping:

- `menus/ccc-root.json` `choices[]` → the intent nodes under `START`. Use each choice's `command` as the node label.
- `menus/ccc-<id>.json` `choices[]` → leaves under that intent. Label with `command` when it is a skill or skill-plus-argument, otherwise with `label`. Skip `back` choices.
- `workflows/*.workflow.js` → leaves under a `WF` node labelled `plugin workflows`, each `/commander:<name>`.
- Node ids are short and unique (`B1`, `R2`, `M5`, `W3`). Wrap labels that contain `/`, `:` or spaces in `["…"]` so Mermaid parses them.

````
```mermaid
graph TD
    START(["/ccc"]) --> INTENT{Pick an intent}
    INTENT -->|🏗️| BUILD["/ccc-build"]
    INTENT -->|🔬| REVIEW["/ccc-review"]
    INTENT -->|🚀| SHIP["/ccc-ship"]
    INTENT -->|🎨| DESIGN["/ccc-design"]
    INTENT -->|🧠| LEARN["/ccc-learn"]
    INTENT -->|⏭️| MORE["/ccc-more"]

    BUILD --> B1["web app"]
    BUILD --> B2["API"]
    REVIEW --> R1["branch diff"]
    REVIEW --> R2["/ccc-xray"]
    SHIP --> S1["preflight"]
    SHIP --> S2["/ccc-rollback"]
    DESIGN --> D1["landing page"]
    LEARN --> L1["/ccc-learn marketing"]

    MORE --> M1["/ccc-plan"]
    MORE --> M2["/ccc-xray"]
    MORE --> M3["/ccc-linear"]
    MORE --> M4["/ccc-fleet"]
    MORE --> M5["/ccc-codex"]
    MORE --> M6["/ccc-connect"]
    MORE --> M7["/ccc-tuneup"]
    MORE --> M8["/ccc-browse"]
    MORE --> WF["plugin workflows"]

    WF --> W1["/commander:ccc-audit"]
    WF --> W2["/commander:ccc-deep-review"]
    WF --> W3["/commander:ccc-fleet"]
    WF --> W4["/commander:ccc-migrate"]
    WF --> W5["/commander:ccc-prompt-audit"]
    WF --> W6["/commander:ccc-release-audit"]

    classDef entry fill:#7c3aed,color:#fff,stroke:#5b21b6
    classDef workflow fill:#1e3a8a,color:#fff,stroke:#1e40af
    classDef leaf fill:#0f172a,color:#cbd5e1,stroke:#334155
    class START entry
    class BUILD,REVIEW,SHIP,DESIGN,LEARN,MORE,WF workflow
    class B1,B2,R1,R2,S1,S2,D1,L1,M1,M2,M3,M4,M5,M6,M7,M8,W1,W2,W3,W4,W5,W6 leaf
```
````

Validity checks before rendering:

- Every node id used in a `class` line is defined above it.
- No label contains an unescaped `"` or `|`.
- One `graph TD` block; no HTML.
- Too many leaves to read (more than about 60 nodes): collapse each menu to its first four leaves plus a `+n more` node, where `n` is computed from the file.
