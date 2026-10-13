#!/usr/bin/env python3
"""Generate Pydantic v2 models from the PACT OpenAPI specifications.

The specs in ``packages/pact-data-model/schemas`` are the single source of
truth for the PACT data model (shared with the TypeScript ``pact-data-model``
package). This script mirrors that package's ``generate-types`` step for
Python: it produces one module per spec version under
``src/pact_api_client/models``.

Usage::

    pip install -e ".[codegen]"
    python codegen.py

Requires ``datamodel-code-generator`` (installed via the ``codegen`` extra).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Shared OpenAPI specs live in the sibling pact-data-model package.
SCHEMAS_DIR = HERE.parent / "pact-data-model" / "schemas"
MODELS_DIR = HERE / "src" / "pact_api_client" / "models"

# Spec files -> generated module name (matches TS namespaces: v2_0 .. v3_0).
SPEC_GLOB = "openapi_v*.yaml"


def spec_to_module(spec_path: Path) -> str:
    # openapi_v3_0.yaml -> v3_0
    return spec_path.stem.replace("openapi_", "")


def generate(spec_path: Path, out_path: Path) -> None:
    print(f"Generating {out_path.name} from {spec_path.name} ...")
    subprocess.run(
        [
            sys.executable,
            "-m",
            "datamodel_code_generator",
            "--input",
            str(spec_path),
            "--input-file-type",
            "openapi",
            # Only emit models for components/schemas (skip path/operation noise),
            # matching the TS generator which reads components.schemas only.
            "--openapi-scopes",
            "schemas",
            "--output",
            str(out_path),
            "--output-model-type",
            "pydantic_v2.BaseModel",
            "--use-annotated",
            "--use-standard-collections",
            "--field-constraints",
            "--use-schema-description",
            "--use-title-as-name",
            # Deduplicate structurally-identical models produced by allOf/oneOf.
            "--reuse-model",
            "--target-python-version",
            "3.9",
            "--disable-timestamp",
        ],
        check=True,
    )


def main() -> int:
    if not SCHEMAS_DIR.is_dir():
        print(f"ERROR: schemas directory not found: {SCHEMAS_DIR}", file=sys.stderr)
        return 1

    specs = sorted(SCHEMAS_DIR.glob(SPEC_GLOB))
    if not specs:
        print(f"ERROR: no specs matching {SPEC_GLOB} in {SCHEMAS_DIR}", file=sys.stderr)
        return 1

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    for spec in specs:
        module = spec_to_module(spec)
        generate(spec, MODELS_DIR / f"{module}.py")

    print(f"Done. Generated {len(specs)} model module(s) in {MODELS_DIR}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
