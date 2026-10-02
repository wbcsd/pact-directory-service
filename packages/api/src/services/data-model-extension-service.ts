import { Kysely, sql } from 'kysely';
import { Database } from '@src/database/types';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '@src/common/errors';
import { registerPolicy, Role } from '@src/common/policies';
import { UserContext } from './user-service';
import { ListQuery, ListResult } from '@src/common/list-query';
import { assertHttpsUrl, fetchPublicJson } from '@src/common/safe-fetch';

// The registry is readable by every role so the node form can offer the choices.
registerPolicy(
  [Role.Root, Role.Administrator, Role.User],
  'view-data-model-extensions'
);
registerPolicy([Role.Root], 'manage-data-model-extensions');

export type DataModelExtensionStatus = 'active' | 'deprecated';

export interface DataModelExtensionData {
  id: number;
  name: string;
  dataSchemaUrl: string;
  documentationUrl: string | null;
  specVersion: string;
  version: string | null;
  description: string | null;
  author: string | null;
  contactEmail: string | null;
  status: DataModelExtensionStatus;
  schemaJson: Record<string, unknown> | null;
  schemaFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  nodesCount?: number;
}

/** Compact shape embedded in node payloads. */
export interface DataModelExtensionSummary {
  id: number;
  name: string;
  dataSchemaUrl: string;
  documentationUrl: string | null;
  version: string | null;
  status: DataModelExtensionStatus;
}

export interface CreateDataModelExtensionData {
  name: string;
  dataSchemaUrl: string;
  documentationUrl?: string | null;
  specVersion?: string;
  version?: string | null;
  description?: string | null;
  author?: string | null;
  contactEmail?: string | null;
  status?: DataModelExtensionStatus;
  schemaJson?: Record<string, unknown> | null;
}

export type UpdateDataModelExtensionData = Partial<CreateDataModelExtensionData>;

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SORT_FIELDS = [
  'name',
  'author',
  'specVersion',
  'version',
  'status',
  'createdAt',
  'updatedAt',
];

const SELECTABLE_COLUMNS = [
  'id',
  'name',
  'dataSchemaUrl',
  'documentationUrl',
  'specVersion',
  'version',
  'description',
  'author',
  'contactEmail',
  'status',
  'schemaFetchedAt',
  'createdAt',
  'updatedAt',
] as const;

export class DataModelExtensionService {
  constructor(private db: Kysely<Database>) {}

  /**
   * CamelCasePlugin rewrites nested JSON keys, which would corrupt a third-party
   * schema, so the cached document is always read back as raw text.
   */
  private baseSelect() {
    return this.db
      .selectFrom('data_model_extensions')
      .select(
        SELECTABLE_COLUMNS.map((c) => `data_model_extensions.${c}` as const)
      )
      .select(
        sql<string | null>`data_model_extensions.schema_json::text`.as(
          'schemaJsonText'
        )
      );
  }

  private toData(row: Record<string, unknown>): DataModelExtensionData {
    const { schemaJsonText, ...rest } = row;
    return {
      ...rest,
      schemaJson: schemaJsonText
        ? (JSON.parse(schemaJsonText as string) as Record<string, unknown>)
        : null,
    } as DataModelExtensionData;
  }

  private assertCanView(context: UserContext) {
    if (!context.policies.includes('view-data-model-extensions')) {
      throw new ForbiddenError(
        'You are not allowed to view data model extensions'
      );
    }
  }

  private assertCanManage(context: UserContext) {
    if (!context.policies.includes('manage-data-model-extensions')) {
      throw new ForbiddenError(
        'You are not allowed to manage data model extensions'
      );
    }
  }

  /**
   * Normalises and validates the writable fields. `partial` skips the
   * required-field checks so it can be reused for updates.
   */
  private async validate(
    data: CreateDataModelExtensionData | UpdateDataModelExtensionData,
    partial: boolean
  ): Promise<Record<string, unknown>> {    const values: Record<string, unknown> = {};

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (name.length === 0) {
        throw new BadRequestError('Name is required');
      }
      values.name = name;
    } else if (!partial) {
      throw new BadRequestError('Name is required');
    }

    if (data.dataSchemaUrl !== undefined) {
      const url = data.dataSchemaUrl.trim();
      if (url.length === 0) {
        throw new BadRequestError('Data schema URL is required');
      }
      // Spec § 5 requires the dataSchema URL to use the https scheme.
      assertHttpsUrl(url);
      values.dataSchemaUrl = url;
    } else if (!partial) {
      throw new BadRequestError('Data schema URL is required');
    }

    if (data.documentationUrl !== undefined) {
      const url = data.documentationUrl?.trim();
      if (url) {
        assertHttpsUrl(url);
        values.documentationUrl = url;
      } else {
        values.documentationUrl = null;
      }
    }

    if (data.specVersion !== undefined) {
      const specVersion = data.specVersion?.trim();
      if (!specVersion || !SEMVER_PATTERN.test(specVersion)) {
        throw new BadRequestError(
          'Spec version must be a semantic version, e.g. 2.0.0'
        );
      }
      values.specVersion = specVersion;
    }

    if (data.version !== undefined) {
      const version = data.version?.trim();
      if (version && !SEMVER_PATTERN.test(version)) {
        throw new BadRequestError(
          'Version must be a semantic version, e.g. 1.0.0'
        );
      }
      values.version = version || null;
    }

    if (data.description !== undefined) {
      values.description = data.description?.trim() || null;
    }

    if (data.author !== undefined) {
      values.author = data.author?.trim() || null;
    }

    if (data.contactEmail !== undefined) {
      const email = data.contactEmail?.trim();
      if (email && !EMAIL_PATTERN.test(email)) {
        throw new BadRequestError('Contact email is not a valid email address');
      }
      values.contactEmail = email ? email.toLowerCase() : null;
    }

    if (data.status !== undefined) {
      if (!['active', 'deprecated'].includes(data.status)) {
        throw new BadRequestError('Status must be "active" or "deprecated"');
      }
      values.status = data.status;
    }

    if (data.schemaJson !== undefined) {
      if (data.schemaJson === null) {
        values.schemaJson = null;
        values.schemaFetchedAt = null;
      } else {
        if (
          typeof data.schemaJson !== 'object' ||
          Array.isArray(data.schemaJson)
        ) {
          throw new BadRequestError('Schema must be a JSON object');
        }
        values.schemaJson = data.schemaJson;
        values.schemaFetchedAt = new Date();
      }
    }

    return values;
  }

  /**
   * List registry entries with pagination, search and sorting.
   */
  async list(
    context: UserContext,
    query: ListQuery = ListQuery.default()
  ): Promise<ListResult<DataModelExtensionData>> {
    this.assertCanView(context);

    let qb = this.baseSelect().select((eb) =>
      eb
        .selectFrom('node_data_model_extensions')
        .select((eb2) =>
          eb2.fn.count<number>('node_data_model_extensions.nodeId').as('count')
        )
        .whereRef(
          'node_data_model_extensions.extensionId',
          '=',
          'data_model_extensions.id'
        )
        .as('nodesCount')
    );

    if (query.filters?.status) {
      qb = qb.where(
        'data_model_extensions.status',
        '=',
        query.filters.status as DataModelExtensionStatus
      );
    }

    if (query.search) {
      const search = `%${query.search}%`;
      qb = qb.where((eb) =>
        eb.or([
          eb('data_model_extensions.name', 'ilike', search),
          eb('data_model_extensions.description', 'ilike', search),
          eb('data_model_extensions.author', 'ilike', search),
          eb('data_model_extensions.dataSchemaUrl', 'ilike', search),
        ])
      );
    }

    const total = Number(
      (
        await qb
          .clearSelect()
          .select((eb) => eb.fn.count('data_model_extensions.id').as('total'))
          .executeTakeFirstOrThrow()
      ).total
    );

    const sortBy = query.sortBy || 'name';
    if (VALID_SORT_FIELDS.includes(sortBy)) {
      qb = qb.orderBy(
        `data_model_extensions.${sortBy}` as any,
        query.sortOrder || 'asc'
      );
    } else {
      qb = qb.orderBy('data_model_extensions.name', 'asc');
    }

    const data = await qb.offset(query.offset).limit(query.limit).execute();

    return {
      data: data.map((row) => this.toData(row as Record<string, unknown>)),
      pagination: query.pagination(total),
    };
  }

  /**
   * Get a single registry entry by ID.
   */
  async get(
    context: UserContext,
    id: number
  ): Promise<DataModelExtensionData> {
    this.assertCanView(context);

    const extension = await this.baseSelect()
      .where('data_model_extensions.id', '=', id)
      .executeTakeFirst();

    if (!extension) {
      throw new NotFoundError('Data model extension not found');
    }

    return this.toData(extension as Record<string, unknown>);
  }

  /**
   * Create a new registry entry.
   */
  async create(
    context: UserContext,
    data: CreateDataModelExtensionData
  ): Promise<DataModelExtensionData> {
    this.assertCanManage(context);

    const values = await this.validate(data, false);

    const existing = await this.db
      .selectFrom('data_model_extensions')
      .select('id')
      .where('dataSchemaUrl', '=', values.dataSchemaUrl as string)
      .executeTakeFirst();

    if (existing) {
      throw new ConflictError(
        'A data model extension with this data schema URL already exists'
      );
    }

    const created = await this.db
      .insertInto('data_model_extensions')
      .values({
        ...(values as any),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return this.get(context, created.id);
  }

  /**
   * Update an existing registry entry.
   */
  async update(
    context: UserContext,
    id: number,
    data: UpdateDataModelExtensionData
  ): Promise<DataModelExtensionData> {
    this.assertCanManage(context);

    await this.get(context, id);

    const values = await this.validate(data, true);

    if (values.dataSchemaUrl) {
      const conflicting = await this.db
        .selectFrom('data_model_extensions')
        .select('id')
        .where('dataSchemaUrl', '=', values.dataSchemaUrl as string)
        .where('id', '!=', id)
        .executeTakeFirst();

      if (conflicting) {
        throw new ConflictError(
          'A data model extension with this data schema URL already exists'
        );
      }
    }

    const updated = await this.db
      .updateTable('data_model_extensions')
      .set({ ...(values as any), updatedAt: new Date() })
      .where('id', '=', id)
      .returning('id')
      .executeTakeFirstOrThrow();

    return this.get(context, updated.id);
  }

  /**
   * Delete a registry entry. Refuses while nodes still reference it.
   */
  async delete(
    context: UserContext,
    id: number
  ): Promise<{ success: boolean; id: number }> {
    this.assertCanManage(context);

    await this.get(context, id);

    const linked = Number(
      (
        await this.db
          .selectFrom('node_data_model_extensions')
          .select((eb) => eb.fn.countAll().as('total'))
          .where('extensionId', '=', id)
          .executeTakeFirstOrThrow()
      ).total
    );

    if (linked > 0) {
      throw new ConflictError(
        `This data model extension is attached to ${linked} node(s). Detach it from those nodes before deleting.`
      );
    }

    await this.db
      .deleteFrom('data_model_extensions')
      .where('id', '=', id)
      .execute();

    return { success: true, id };
  }

  /**
   * Retrieve and validate an extension schema file so the form can preview it.
   */
  async fetchSchema(
    context: UserContext,
    dataSchemaUrl: string
  ): Promise<{
    schemaJson: Record<string, unknown>;
    name?: string;
    description?: string;
  }> {
    this.assertCanManage(context);

    if (!dataSchemaUrl || dataSchemaUrl.trim().length === 0) {
      throw new BadRequestError('Data schema URL is required');
    }

    const schemaJson = await fetchPublicJson(dataSchemaUrl.trim());

    const looksLikeJsonSchema =
      '$schema' in schemaJson || 'type' in schemaJson || 'properties' in schemaJson;
    if (!looksLikeJsonSchema) {
      throw new BadRequestError(
        'The document does not look like a JSON Schema (missing $schema, type or properties)'
      );
    }

    return {
      schemaJson,
      name: typeof schemaJson.title === 'string' ? schemaJson.title : undefined,
      description:
        typeof schemaJson.description === 'string'
          ? schemaJson.description
          : undefined,
    };
  }

  /**
   * Verify the given IDs all exist, for use when attaching extensions to a node.
   */
  async assertAllExist(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    const found = await this.db
      .selectFrom('data_model_extensions')
      .select('id')
      .where('id', 'in', ids)
      .execute();

    const foundIds = new Set(found.map((row) => row.id));
    const missing = ids.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new BadRequestError(
        `Unknown data model extension(s): ${missing.join(', ')}`
      );
    }
  }
}
