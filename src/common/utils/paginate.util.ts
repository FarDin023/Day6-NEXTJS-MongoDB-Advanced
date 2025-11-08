import { Model, QueryWithHelpers, Document } from 'mongoose';

export interface PaginationOptions {
  page?: string | number;
  pageSize?: string | number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T = any> {
  items: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface MongooseQueryOptions {
  filter?: Record<string, any>;
  projection?: Record<string, any>;
  populate?: string | string[];
}

export async function paginate<T extends Document>(
  model: Model<T>,
  options: PaginationOptions & MongooseQueryOptions
): Promise<PaginatedResult<T>> {
  const {
    page = 1,
    pageSize = 10,
    sort = { createdAt: -1 },
    filter = {},
    projection = {},
    populate,
  } = options;

  // Parse pagination parameters
  const parsedPage = Math.max(1, Number(page));
  const parsedPageSize = Math.max(1, Number(pageSize));
  const skip = (parsedPage - 1) * parsedPageSize;

  // Build the base query
  let query = model.find(filter);

  // Apply projection if provided
  if (Object.keys(projection).length > 0) {
    query = query.select(projection);
  }

  // Apply population if provided
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(path => {
        query = query.populate(path);
      });
    } else {
      query = query.populate(populate);
    }
  }

  // Execute the queries in parallel
  const [itemsResult, total] = await Promise.all([
    query
      .sort(sort)
      .skip(skip)
      .limit(parsedPageSize)
      .lean(),
    model.countDocuments(filter),
  ]);

  const items = itemsResult as unknown as T[];

  return {
    items,
    meta: {
      total,
      page: parsedPage,
      pageSize: parsedPageSize,
      totalPages: Math.ceil(total / parsedPageSize),
    },
  };
}