# Science pack decisions

Source: https://github.com/K-Dense-AI/scientific-agent-skills at commit `ec59a29a03d5c40f73ab40878df04860bc00e876`, 177 skill directories under `skills/`. The repository LICENSE.md is MIT and is copied here as `LICENSE.txt`; each upstream SKILL.md also declares its own `license:` in frontmatter, and that per-skill value decides eligibility.

## Rules applied

- Eligible: frontmatter `license:` is MIT (any casing, "MIT license" included) and the skill has no separate non-MIT LICENSE file. `pacsomatic` ships its own LICENSE file, which is MIT, so it stays eligible.
- Excluded by license: BSD, Apache, GPL, CC, PolyForm, proprietary, "Unknown", URL-only and missing `license:` values.
- Size: the pack stays under 6 MB on disk (`du -sh`). No binary assets (images, PDFs, archives, model files) exist in the eligible set; any file over 200 KB is excluded, and a skill that needs such a file is excluded whole.
- Overlap: skills that duplicate an existing Commander skill (`skills/`, `skills/ccc-data/`, `skills/ccc-research/`) or reuse a Commander skill name are skipped.
- Priority within the budget: statistics, data analysis, plotting, literature search, bioinformatics basics and chemistry basics first, then a few widely used physics, geospatial, neuroscience, imaging and lab-automation tools.
- Load path: the pack is not in `skills/_tiers.json`, so the default (essential) and recommended installs do not link it. Every sub-skill sets `disable-model-invocation: true`; only the `science-pack` router is selectable, and only where the pack is installed (for example a full install).

## Included (48)

| Field | Skills |
|---|---|
| Statistics and study design | `statistical-analysis`, `statistical-power`, `experimental-design`, `uncertainty-and-units`, `scikit-survival` |
| Data analysis and data handling | `exploratory-data-analysis`, `vaex`, `zarr-python`, `datalad` |
| Plotting and figures | `scientific-visualization` |
| Literature search and scholarly writing | `paper-lookup`, `pyzotero`, `bgpt-paper-search`, `exa-search`, `scientific-critical-thinking`, `scientific-writing`, `scientific-brainstorming` |
| Bioinformatics and genomics | `pysam`, `genomic-coordinates`, `bulk-rnaseq`, `pydeseq2`, `pathway-enrichment`, `primer-design`, `ontology-term-resolution`, `cellxgene-census`, `qiime2-amplicon`, `mageck`, `flowkit`, `tiledbvcf`, `esm`, `alphagenome` |
| Chemistry and materials | `deepchem`, `molecular-dynamics`, `cantera`, `pycalphad`, `pymatgen`, `nmrglue`, `tellurium`, `13c-metabolic-flux`, `marine-carbonate-chemistry`, `diffdock` |
| Physics, engineering and simulation | `pybamm` |
| Geospatial | `geopandas` |
| Neuroscience, imaging and lab data | `neurokit2`, `pydicom`, `cellprofiler`, `nwb-conversion`, `opentrons-integration` |

## Excluded by license (59)

| Skill | Declared license |
|---|---|
| `aeon` | BSD-3-Clause license |
| `anndata` | BSD-3-Clause license |
| `arboreto` | BSD-3-Clause license |
| `astropy` | BSD-3-Clause license |
| `bids` | https://creativecommons.org/licenses/by/4.0/ |
| `biopython` | Biopython License Agreement |
| `bioservices` | GPLv3 license |
| `cirq` | Apache-2.0 license |
| `cobrapy` | GPL-2.0 license |
| `dask` | BSD-3-Clause license |
| `datamol` | Apache-2.0 license |
| `deepspot-m` | PolyForm-Noncommercial-1.0.0 |
| `deeptools` | BSD license |
| `depmap` | CC-BY-4.0 |
| `etetoolkit` | GPL-3.0-or-later |
| `flowio` | BSD-3-Clause license |
| `gget` | BSD-2-Clause license |
| `glycoengineering` | Unknown |
| `histolab` | Apache-2.0 license |
| `hugging-science` | MISSING |
| `infographics` | MISSING |
| `lamindb` | Apache-2.0 license |
| `latex-posters` | MISSING |
| `liteparse` | Apache-2.0 |
| `markdown-mermaid-writing` | Apache-2.0 |
| `matchms` | Apache-2.0 |
| `matplotlib` | https://github.com/matplotlib/matplotlib/tree/main/LICENSE |
| `medchem` | Apache-2.0 license |
| `modal` | Apache-2.0 |
| `molfeat` | Apache-2.0 license |
| `networkx` | 3-clause BSD license |
| `nextflow` | Apache-2.0 |
| `openpiv` | BSD-3-Clause |
| `pennylane` | Apache-2.0 license |
| `phylogenetics` | Unknown |
| `polars` | https://github.com/pola-rs/polars/blob/main/LICENSE |
| `polars-bio` | Apache-2.0 |
| `primekg` | Unknown |
| `pyhealth` | MISSING |
| `pymc` | Apache License, Version 2.0 |
| `pymoo` | Apache-2.0 license |
| `pyopenms` | 3 clause BSD license |
| `pytorch-lightning` | Apache-2.0 license |
| `qiskit` | Apache-2.0 |
| `rdkit` | BSD-3-Clause license |
| `rowan` | Proprietary (API key required) |
| `scanpy` | BSD-3-Clause |
| `scikit-bio` | BSD-3-Clause license |
| `scikit-learn` | BSD-3-Clause license |
| `scvelo` | BSD-3-Clause |
| `scvi-tools` | BSD-3-Clause license |
| `seaborn` | BSD-3-Clause license |
| `statsmodels` | BSD-3-Clause license |
| `sympy` | https://github.com/sympy/sympy/blob/master/LICENSE |
| `timesfm-forecasting` | Apache-2.0 license |
| `torchdrug` | Apache-2.0 license |
| `transformers` | Apache-2.0 license |
| `umap-learn` | BSD-3-Clause license |
| `what-if-oracle` | CC BY-NC-SA 4.0 |

## Excluded by size or assets (1)

| Skill | Reason |
|---|---|
| `onekgpd` | needs its bundled assets/kgpe.json (1.0 MB, over the 200 KB asset limit) for offline metadata; excluded whole |

## Excluded by overlap (6)

| Skill | Overlaps with |
|---|---|
| `citation-management` | citation management is covered by skills/ccc-research/literature-review |
| `literature-review` | same name and scope as skills/ccc-research/literature-review |
| `market-research-reports` | market research is skills/ccc-research/competitive-analysis and trend-analysis |
| `markitdown` | document-to-text ingestion is skills/ccc-research/data-ingestion |
| `paperclip` | name collides with Commander skill skills/paperclip (a different tool) |
| `research-lookup` | cited multi-source research is skills/ccc-research/deep-research |

## Available upstream (63)

MIT-licensed and eligible, but left out to keep the pack under the 6 MB budget and focused on the priority fields. Install them from upstream at the pinned commit if needed. Sizes are upstream bytes on disk.

| Skill | Size | Note |
|---|---|---|
| `adaptyv` | 33 KB |  |
| `analytical-method-validation` | 219 KB |  |
| `arbor` | 62 KB |  |
| `autoskill` | 59 KB |  |
| `benchling-integration` | 55 KB |  |
| `clinical-decision-support` | 201 KB |  |
| `clinical-reports` | 198 KB |  |
| `consciousness-council` | 20 KB |  |
| `database-lookup` | 397 KB | shortlisted, cut for size |
| `dhdna-profiler` | 15 KB |  |
| `dnanexus-integration` | 154 KB |  |
| `fictiv` | 127 KB |  |
| `fluidsim` | 202 KB |  |
| `folklore-variant-evidence` | 24 KB |  |
| `generate-image` | 64 KB |  |
| `geniml` | 168 KB |  |
| `genomic-intelligence` | 61 KB |  |
| `geomaster` | 147 KB |  |
| `get-available-resources` | 141 KB | shortlisted, cut for size |
| `ginkgo-cloud-lab` | 57 KB |  |
| `gtars` | 146 KB |  |
| `hypogenic` | 150 KB |  |
| `hypothesis-generation` | 260 KB | shortlisted, cut for size |
| `imaging-data-commons` | 239 KB | Skill text is MIT; IDC imaging data carries its own per-collection licenses (mostly CC-BY, some CC-NC) |
| `iso-standards-readiness` | 267 KB |  |
| `lab-hardware-cad` | 184 KB |  |
| `labarchive-integration` | 88 KB |  |
| `latchbio-integration` | 90 KB |  |
| `matlab` | 167 KB |  |
| `ncats-arax` | 108 KB |  |
| `neuropixels-analysis` | 140 KB |  |
| `omero-integration` | 151 KB |  |
| `open-notebook` | 66 KB |  |
| `optimize-for-gpu` | 294 KB |  |
| `pacsomatic` | 57 KB |  |
| `paperzilla` | 16 KB |  |
| `parallel-web` | 39 KB |  |
| `pathml` | 162 KB |  |
| `pathogen-variant-surveillance` | 103 KB |  |
| `peer-review` | 196 KB | shortlisted, cut for size |
| `pi-agent` | 270 KB |  |
| `pkpd-modeling` | 276 KB |  |
| `pptx-posters` | 247 KB |  |
| `protocolsio-integration` | 151 KB |  |
| `pufferlib` | 142 KB |  |
| `pylabrobot` | 117 KB | shortlisted, cut for size |
| `pytdc` | 119 KB | shortlisted, cut for size |
| `qutip` | 149 KB | shortlisted, cut for size |
| `relion` | 38 KB |  |
| `relsa-severity-assessment` | 123 KB |  |
| `research-grants` | 145 KB |  |
| `scholar-evaluation` | 165 KB |  |
| `scientific-schematics` | 101 KB |  |
| `scientific-slides` | 381 KB |  |
| `shap` | 137 KB | shortlisted, cut for size |
| `simpy` | 155 KB | shortlisted, cut for size |
| `stable-baselines3` | 86 KB |  |
| `tamarind` | 46 KB |  |
| `torch-geometric` | 84 KB |  |
| `treatment-plans` | 161 KB |  |
| `usfiscaldata` | 68 KB |  |
| `venue-templates` | 314 KB |  |
| `waypoint-bio` | 89 KB |  |

## Safety notes added

Upstream instructions were checked for force-push, hook skipping, auto-merge and unasked third-party data sends ([docs/tstack/SAFETY.md](../../docs/tstack/SAFETY.md)). None of the included skills tells the agent to force-push, skip hooks or auto-merge. The changes, each marked "CCC safety:" in the skill:

| Skill | Upstream behavior | CCC safety note | Rule |
|---|---|---|---|
| `datalad` | Publishing example runs `create-sibling-github`, `git annex initremote` and `datalad push` | Run only after the user approves the exact target; never push to a default branch, force-push or skip hooks | R1, R2, R8 |
| `datalad` | `datalad drop`, `--reckless availability` | Ask before any drop or remove; `--reckless` only with an explicit OK | R8 |
| `pyzotero` | Creates, updates, deletes and uploads Zotero items | Show the planned change and ask before every write or delete | R8 |
| `exa-search`, `bgpt-paper-search`, `alphagenome`, `esm`, `pyzotero`, `tiledbvcf`, `pymatgen`, `paper-lookup`, `ontology-term-resolution`, `scientific-critical-thinking` | Send queries or user inputs to hosted services | Ask before sending unpublished user data; keys come only from the user's own environment | data |

Every copied SKILL.md ends with a `## Source` section (repository, path, pinned commit, MIT, license location) and lists its CCC edits there. No upstream description contained `<` or `>`, so no description was rewritten.
