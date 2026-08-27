import { DataModelExtensionService } from './data-model-extension-service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@src/common/errors';
import { Role } from '@src/common/policies';
import { createMockDatabase } from '../common/mock-utils';
import { UserContext } from './user-service';
import { ListQuery } from '@src/common/list-query';

describe('DataModelExtensionService', () => {
  let dbMocks: ReturnType<typeof createMockDatabase>;
  let service: DataModelExtensionService;

  const rootContext: UserContext = {
    organizationId: 1,
    userId: 1,
    email: 'root@example.com',
    role: Role.Root,
    policies: ['view-data-model-extensions', 'manage-data-model-extensions'],
    status: 'enabled',
  };

  const adminContext: UserContext = {
    organizationId: 1,
    userId: 2,
    email: 'admin@example.com',
    role: Role.Administrator,
    policies: ['view-data-model-extensions'],
    status: 'enabled',
  };

  const noAccessContext: UserContext = {
    organizationId: 1,
    userId: 3,
    email: 'user@example.com',
    role: Role.User,
    policies: [],
    status: 'enabled',
  };

  const mockRow = {
    id: 1,
    name: 'PACT Primary Data Share',
    dataSchemaUrl: 'https://catalog.carbon-transparency.com/pds/1.0.0/schema.json',
    documentationUrl: null,
    specVersion: '2.0.0',
    version: '1.0.0',
    description: null,
    author: 'WBCSD',
    contactEmail: null,
    status: 'active' as const,
    schemaJsonText: null,
    schemaFetchedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dbMocks = createMockDatabase();
    service = new DataModelExtensionService(dbMocks.db as any);
  });

  describe('list', () => {
    it('returns entries with pagination for a viewer', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([mockRow]);

      const result = await service.list(adminContext, ListQuery.default());

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('PACT Primary Data Share');
      expect(result.pagination.total).toBe(1);
    });

    it('parses the cached schema back from raw text', async () => {
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 1 });
      dbMocks.executors.execute.mockResolvedValueOnce([
        { ...mockRow, schemaJsonText: '{"primary_data_share":{"type":"number"}}' },
      ]);

      const result = await service.list(adminContext, ListQuery.default());

      // Snake_case keys inside the schema must survive CamelCasePlugin untouched
      expect(result.data[0].schemaJson).toEqual({
        primary_data_share: { type: 'number' },
      });
    });

    it('throws ForbiddenError without the view policy', async () => {
      await expect(service.list(noAccessContext)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('get', () => {
    it('throws NotFoundError when the entry does not exist', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(undefined);

      await expect(service.get(adminContext, 999)).rejects.toThrow(NotFoundError);
    });

    it('returns the entry', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockRow);

      const result = await service.get(adminContext, 1);

      expect(result.id).toBe(1);
      expect(result.schemaJson).toBeNull();
    });
  });

  describe('create', () => {
    it('throws ForbiddenError for a user without the manage policy', async () => {
      await expect(
        service.create(adminContext, {
          name: 'Shipment',
          dataSchemaUrl: 'https://example.com/schema.json',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects a non-https data schema URL', async () => {
      await expect(
        service.create(rootContext, {
          name: 'Shipment',
          dataSchemaUrl: 'http://example.com/schema.json',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects a data schema URL pointing at a private host', async () => {
      await expect(
        service.create(rootContext, {
          name: 'Shipment',
          dataSchemaUrl: 'https://127.0.0.1/schema.json',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects a non-semver version', async () => {
      await expect(
        service.create(rootContext, {
          name: 'Shipment',
          dataSchemaUrl: 'https://example.com/schema.json',
          version: 'v1',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects a blank name', async () => {
      await expect(
        service.create(rootContext, {
          name: '   ',
          dataSchemaUrl: 'https://example.com/schema.json',
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ConflictError when the data schema URL is already registered', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({ id: 7 });

      await expect(
        service.create(rootContext, {
          name: 'Shipment',
          dataSchemaUrl: 'https://example.com/schema.json',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('creates the entry and reads it back', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(undefined); // uniqueness check
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ id: 1 });
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockRow); // read back

      const result = await service.create(rootContext, {
        name: 'PACT Primary Data Share',
        dataSchemaUrl:
          'https://catalog.carbon-transparency.com/pds/1.0.0/schema.json',
      });

      expect(dbMocks.db.insertInto).toHaveBeenCalledWith('data_model_extensions');
      expect(result.id).toBe(1);
    });
  });

  describe('update', () => {
    it('throws ForbiddenError for a user without the manage policy', async () => {
      await expect(
        service.update(adminContext, 1, { name: 'New' })
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ConflictError when another entry uses the same data schema URL', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockRow); // existing entry
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({ id: 9 }); // conflicting entry

      await expect(
        service.update(rootContext, 1, {
          dataSchemaUrl: 'https://example.com/other.json',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('updates the entry and reads it back', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockRow);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ id: 1 });
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce({
        ...mockRow,
        status: 'deprecated',
      });

      const result = await service.update(rootContext, 1, {
        status: 'deprecated',
      });

      expect(result.status).toBe('deprecated');
    });
  });

  describe('delete', () => {
    it('throws ForbiddenError for a user without the manage policy', async () => {
      await expect(service.delete(adminContext, 1)).rejects.toThrow(ForbiddenError);
    });

    it('refuses while nodes still reference the entry', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockRow);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 3 });

      await expect(service.delete(rootContext, 1)).rejects.toThrow(ConflictError);
      expect(dbMocks.db.deleteFrom).not.toHaveBeenCalled();
    });

    it('deletes an unreferenced entry', async () => {
      dbMocks.executors.executeTakeFirst.mockResolvedValueOnce(mockRow);
      dbMocks.executors.executeTakeFirstOrThrow.mockResolvedValueOnce({ total: 0 });
      dbMocks.executors.execute.mockResolvedValueOnce(undefined);

      const result = await service.delete(rootContext, 1);

      expect(result).toEqual({ success: true, id: 1 });
      expect(dbMocks.db.deleteFrom).toHaveBeenCalledWith('data_model_extensions');
    });
  });

  describe('fetchSchema', () => {
    it('throws ForbiddenError for a user without the manage policy', async () => {
      await expect(
        service.fetchSchema(adminContext, 'https://example.com/schema.json')
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects a non-https URL', async () => {
      await expect(
        service.fetchSchema(rootContext, 'http://example.com/schema.json')
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects a loopback URL', async () => {
      await expect(
        service.fetchSchema(rootContext, 'https://127.0.0.1/schema.json')
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects a link-local metadata URL', async () => {
      await expect(
        service.fetchSchema(rootContext, 'https://169.254.169.254/latest/meta-data/')
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('assertAllExist', () => {
    it('resolves for an empty list without querying', async () => {
      await expect(service.assertAllExist([])).resolves.toBeUndefined();
      expect(dbMocks.db.selectFrom).not.toHaveBeenCalled();
    });

    it('throws BadRequestError listing the unknown IDs', async () => {
      dbMocks.executors.execute.mockResolvedValueOnce([{ id: 1 }]);

      await expect(service.assertAllExist([1, 2, 3])).rejects.toThrow(
        'Unknown data model extension(s): 2, 3'
      );
    });

    it('resolves when all IDs exist', async () => {
      dbMocks.executors.execute.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

      await expect(service.assertAllExist([1, 2])).resolves.toBeUndefined();
    });
  });
});
