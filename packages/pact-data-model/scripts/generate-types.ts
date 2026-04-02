/**
 * Script to generate TypeScript interface and enum definitions from OpenAPI YAML files.
 * Run with: npm run generate-types
 *
 * Generates src/generated/types_v<version>.ts files, one per YAML schema file.
 */

import * as yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

const SCHEMAS_DIR = path.resolve(__dirname, '..', 'schemas');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'src');

interface OpenAPISpec {
  components?: {
    schemas?: Record<string, any>;
  };
}

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

function toPascalCase(str: string): string {
  return str
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c: string) => c.toUpperCase());
}

/** Make an enum value string into a valid TypeScript identifier. */
function toEnumKey(value: string): string {
  const id = toPascalCase(String(value));
  // If it starts with a digit, prefix with underscore
  return /^\d/.test(id) ? `_${id}` : id;
}

/** Escape a string for a JSDoc comment (remove trailing whitespace, collapse newlines). */
function toDocLine(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Output accumulators
// ---------------------------------------------------------------------------

interface EnumDef {
  name: string;
  values: string[];
  description?: string;
  deprecated?: boolean;
}

interface PropDef {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
  deprecated?: boolean;
}

interface InterfaceDef {
  name: string;
  description?: string;
  extendsName?: string;
  props: PropDef[];
}

interface TypeAliasDef {
  name: string;
  type: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Main generator class
// ---------------------------------------------------------------------------

class TypesGenerator {
  private schemas: Record<string, any>;
  /** Ordered list of output declarations */
  private enums = new Map<string, EnumDef>();
  private aliases = new Map<string, TypeAliasDef>();
  private interfaces = new Map<string, InterfaceDef>();

  constructor(spec: OpenAPISpec) {
    this.schemas = spec.components?.schemas ?? {};
  }

  generate(): string {
    for (const [name, schema] of Object.entries(this.schemas)) {
      this.processTopLevelSchema(name, schema);
    }
    return this.render();
  }

  // -------------------------------------------------------------------------
  // Top-level schema processing
  // -------------------------------------------------------------------------

  private processTopLevelSchema(name: string, schema: any): void {
    if (!schema || typeof schema !== 'object') return;

    // Top-level enum (schema itself is an enum type)
    if (schema.enum) {
      this.registerEnum(name, schema.enum, schema.description, schema.deprecated);
      return;
    }

    // allOf pattern (usually inheritance)
    if (schema.allOf) {
      this.processAllOfSchema(name, schema);
      return;
    }

    // Object schema → interface
    if (schema.type === 'object' || schema.properties) {
      this.processObjectSchema(name, schema);
      return;
    }

    // Simple primitive schema → type alias (e.g. Urn = string, FloatBetween1And3 = number)
    const primitive = this.primitiveType(schema.type);
    if (primitive) {
      this.aliases.set(name, {
        name,
        type: primitive,
        description: schema.description,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Object schemas → interfaces
  // -------------------------------------------------------------------------

  private processObjectSchema(name: string, schema: any): void {
    const required: string[] = schema.required ?? [];
    const props: PropDef[] = [];

    for (const [propName, propSchema] of Object.entries<any>(schema.properties ?? {})) {
      props.push({
        name: propName,
        type: this.resolvePropertyType(name, propName, propSchema),
        optional: !required.includes(propName),
        description: propSchema.description ? toDocLine(propSchema.description) : undefined,
        deprecated: propSchema.deprecated === true,
      });
    }

    this.interfaces.set(name, {
      name,
      description: schema.description ? toDocLine(schema.description) : undefined,
      props,
    });
  }

  // -------------------------------------------------------------------------
  // allOf schemas → interface (possibly extending a base)
  // -------------------------------------------------------------------------

  private processAllOfSchema(name: string, schema: any): void {
    const allOf: any[] = schema.allOf;

    const refEntry = allOf.find(e => e.$ref);
    const objectEntries = allOf.filter(e => !e.$ref);

    // If there are no object entries, it's just a type alias for the ref
    if (refEntry && objectEntries.length === 0) {
      this.aliases.set(name, {
        name,
        type: this.refToName(refEntry.$ref),
        description: schema.description ? toDocLine(schema.description) : undefined,
      });
      return;
    }

    const extendsName = refEntry ? this.refToName(refEntry.$ref) : undefined;

    // Collect required fields from the base schema so that overriding properties
    // that are required in the base remain required in the derived interface.
    const baseRequired = new Set<string>();
    if (refEntry) {
      const baseSchema = this.schemas[this.refToName(refEntry.$ref)];
      for (const r of baseSchema?.required ?? []) baseRequired.add(r);
    }

    const props: PropDef[] = [];

    for (const entry of objectEntries) {
      const required: string[] = entry.required ?? schema.required ?? [];
      for (const [propName, propSchema] of Object.entries<any>(entry.properties ?? {})) {
        props.push({
          name: propName,
          type: this.resolvePropertyType(name, propName, propSchema),
          optional: !required.includes(propName) && !baseRequired.has(propName),
          description: (propSchema as any).description
            ? toDocLine((propSchema as any).description)
            : undefined,
          deprecated: (propSchema as any).deprecated === true,
        });
      }
    }

    this.interfaces.set(name, {
      name,
      description: schema.description ? toDocLine(schema.description) : undefined,
      extendsName,
      props,
    });
  }

  // -------------------------------------------------------------------------
  // Property type resolution
  // -------------------------------------------------------------------------

  private resolvePropertyType(schemaName: string, propName: string, propSchema: any): string {
    if (!propSchema || typeof propSchema !== 'object') return 'unknown';

    const isNullable = propSchema.nullable === true;
    const base = this.resolveBaseType(schemaName, propName, propSchema);
    return isNullable ? `${base} | null` : base;
  }

  private resolveBaseType(schemaName: string, propName: string, propSchema: any): string {
    if (!propSchema || typeof propSchema !== 'object') return 'unknown';

    // Direct $ref
    if (propSchema.$ref) return this.refToName(propSchema.$ref);

    // const → string literal type
    if (propSchema.const !== undefined) return JSON.stringify(propSchema.const);

    // Inline enum
    if (propSchema.enum) {
      const enumName = `${schemaName}${toPascalCase(propName)}`;
      this.registerEnum(enumName, propSchema.enum, propSchema.description, propSchema.deprecated);
      return enumName;
    }

    // allOf with single $ref → treat as that type (description override)
    if (propSchema.allOf?.length === 1 && propSchema.allOf[0].$ref) {
      return this.refToName(propSchema.allOf[0].$ref);
    }

    // oneOf [T, null]
    if (propSchema.oneOf) {
      const nonNull = propSchema.oneOf.find((s: any) => s.type !== 'null' && !this.isNullSchema(s));
      const hasNull = propSchema.oneOf.some((s: any) => s.type === 'null' || this.isNullSchema(s));
      if (nonNull && hasNull) {
        return `${this.resolveBaseType(schemaName, propName, nonNull)} | null`;
      }
    }

    // Array
    if (propSchema.type === 'array') {
      if (!propSchema.items) return 'unknown[]';
      const items = propSchema.items;

      // Array items with enum → named enum for the element type
      if (items.enum) {
        const enumName = `${schemaName}${toPascalCase(propName)}`;
        this.registerEnum(enumName, items.enum, propSchema.description, propSchema.deprecated);
        return `${enumName}[]`;
      }

      return `${this.resolveBaseType(schemaName, propName, items)}[]`;
    }

    // Object
    if (propSchema.type === 'object' || (propSchema.properties && !propSchema.type)) {
      if (propSchema.additionalProperties) {
        const valType = this.resolveBaseType(schemaName, propName, propSchema.additionalProperties);
        return `Record<string, ${valType}>`;
      }
      return 'Record<string, unknown>';
    }

    // Primitive
    const prim = this.primitiveType(propSchema.type);
    return prim ?? 'unknown';
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private primitiveType(type: string): string | null {
    switch (type) {
      case 'string': return 'string';
      case 'number':
      case 'integer': return 'number';
      case 'boolean': return 'boolean';
      default: return null;
    }
  }

  private isNullSchema(schema: any): boolean {
    return schema && schema.type === 'null';
  }

  private registerEnum(name: string, values: any[], description?: string, deprecated?: boolean): void {
    if (!this.enums.has(name)) {
      this.enums.set(name, { name, values: values.map(String), description, deprecated });
    }
  }

  private refToName(ref: string): string {
    const match = ref.match(/#\/components\/schemas\/(.+)$/);
    return match ? match[1] : ref;
  }

  // -------------------------------------------------------------------------
  // Render output
  // -------------------------------------------------------------------------

  private render(): string {
    const lines: string[] = [
      `// This file is auto-generated by scripts/generate-types.ts. Do not edit manually.`,
      ``,
    ];

    for (const enumDef of this.enums.values()) {
      this.renderEnum(enumDef, lines);
    }

    for (const alias of this.aliases.values()) {
      this.renderAlias(alias, lines);
    }

    for (const iface of this.interfaces.values()) {
      this.renderInterface(iface, lines);
    }

    return lines.join('\n');
  }

  private renderEnum(def: EnumDef, lines: string[]): void {
    lines.push(`export enum ${def.name} {`);
    for (const value of def.values) {
      const key = toEnumKey(value);
      lines.push(`  ${key} = ${JSON.stringify(value)},`);
    }
    lines.push(`}`);
    lines.push(``);
  }

  private renderAlias(def: TypeAliasDef, lines: string[]): void {
    if (def.description) {
      lines.push(`/** ${def.description.split('\n')[0].trim()} */`);
    }
    lines.push(`export type ${def.name} = ${def.type};`);
    lines.push(``);
  }

  private renderInterface(def: InterfaceDef, lines: string[]): void {
    if (def.description) {
      lines.push(`/** ${def.description.split('\n')[0].trim()} */`);
    }
    const ext = def.extendsName ? ` extends ${def.extendsName}` : '';
    lines.push(`export interface ${def.name}${ext} {`);
    for (const prop of def.props) {
      const docParts: string[] = [];
      if (prop.description) docParts.push(prop.description.split('\n')[0].trim());
      if (prop.deprecated) docParts.push('@deprecated');
      if (docParts.length > 0) {
        lines.push(`  /** ${docParts.join(' ')} */`);
      }
      const opt = prop.optional ? '?' : '';
      lines.push(`  ${prop.name}${opt}: ${prop.type};`);
    }
    lines.push(`}`);
    lines.push(``);
  }
}

// ---------------------------------------------------------------------------
// File generation
// ---------------------------------------------------------------------------

async function generateTypesFile(yamlFile: string): Promise<void> {
  const match = yamlFile.match(/openapi_v(\d+_\d+)\.yaml$/);
  if (!match) return;

  const versionUnderscore = match[1];
  const versionDot = versionUnderscore.replace('_', '.');
  const yamlPath = path.join(SCHEMAS_DIR, yamlFile);
  const outputPath = path.join(OUTPUT_DIR, `types_v${versionUnderscore}.ts`);

  console.log(`Generating types_v${versionUnderscore}.ts from ${yamlFile} (PACT v${versionDot})...`);

  const yamlContent = await fs.readFile(yamlPath, 'utf8');
  const spec = yaml.load(yamlContent) as OpenAPISpec;

  const content = new TypesGenerator(spec).generate();
  await fs.writeFile(outputPath, content, 'utf8');
  console.log(`  ✓ src/generated/types_v${versionUnderscore}.ts`);
}

async function main(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const files = await fs.readdir(SCHEMAS_DIR);
  const yamlFiles = files.filter(f => /^openapi_v\d+_\d+\.yaml$/.test(f)).sort();

  if (yamlFiles.length === 0) {
    console.error('No OpenAPI YAML schema files found in schemas/');
    process.exit(1);
  }

  console.log(`Found ${yamlFiles.length} YAML file(s). Generating types files...\n`);
  await Promise.all(yamlFiles.map(generateTypesFile));
  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
