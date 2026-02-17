import {
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

export interface BaseFindAllQuery {
  id?: number | string;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  updatedAtFrom?: Date;
  updatedAtTo?: Date;
  limit?: number;
  offset?: number;
}

export abstract class BaseRepository<TEntity extends ObjectLiteral> {
  protected constructor(protected readonly repository: Repository<TEntity>) {}

  protected buildFindAllQuery(
    alias: string,
    query: BaseFindAllQuery = {},
  ): SelectQueryBuilder<TEntity> {
    const qb = this.repository.createQueryBuilder(alias);

    if (query.id !== undefined) {
      qb.andWhere(`${alias}.id = :id`, { id: query.id });
    }

    if (query.createdAtFrom && query.createdAtTo) {
      qb.andWhere(
        `${alias}.createdAt BETWEEN :createdAtFrom AND :createdAtTo`,
        {
          createdAtFrom: query.createdAtFrom,
          createdAtTo: query.createdAtTo,
        },
      );
    } else if (query.createdAtFrom) {
      qb.andWhere(`${alias}.createdAt >= :createdAtFrom`, {
        createdAtFrom: query.createdAtFrom,
      });
    } else if (query.createdAtTo) {
      qb.andWhere(`${alias}.createdAt <= :createdAtTo`, {
        createdAtTo: query.createdAtTo,
      });
    }

    if (query.updatedAtFrom && query.updatedAtTo) {
      qb.andWhere(
        `${alias}.updatedAt BETWEEN :updatedAtFrom AND :updatedAtTo`,
        {
          updatedAtFrom: query.updatedAtFrom,
          updatedAtTo: query.updatedAtTo,
        },
      );
    } else if (query.updatedAtFrom) {
      qb.andWhere(`${alias}.updatedAt >= :updatedAtFrom`, {
        updatedAtFrom: query.updatedAtFrom,
      });
    } else if (query.updatedAtTo) {
      qb.andWhere(`${alias}.updatedAt <= :updatedAtTo`, {
        updatedAtTo: query.updatedAtTo,
      });
    }

    if (typeof query.limit === 'number') {
      qb.take(query.limit);
    }

    if (typeof query.offset === 'number') {
      qb.skip(query.offset);
    }

    return qb;
  }

  async findAll(
    query: BaseFindAllQuery = {},
    alias = 'entity',
  ): Promise<TEntity[]> {
    return this.buildFindAllQuery(alias, query).getMany();
  }

  async findById(id: number | string): Promise<TEntity | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  async create(
    data: Partial<TEntity> | Partial<TEntity>[],
  ): Promise<TEntity | TEntity[]> {
    return this.repository.create(data as any);
  }

  async save(entity: TEntity): Promise<TEntity> {
    return this.repository.save(entity);
  }

  // Soft delete: set deletedAt timestamp and persist
  async delete(entity: TEntity): Promise<void> {
    (entity as any).deletedAt = new Date();
    await this.repository.save(entity as any);
  }

  // Hard delete: physically remove row
  async remove(entity: TEntity): Promise<void> {
    await this.repository.remove(entity as any);
  }
}

