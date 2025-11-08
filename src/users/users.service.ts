import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { FIELD_PRESETS, HIDDEN_FIELDS } from '../constants/field-whitelist';
import { paginate } from '../common/utils/paginate.util';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  // Bulk upsert users (idempotent operation)
  // Get user statistics using faceted aggregation
  async getStats() {
    const [result] = await this.userModel.aggregate([
      {
        $match: { isDeleted: false }
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                avgAge: { $avg: '$age' },
                minAge: { $min: '$age' },
                maxAge: { $max: '$age' }
              }
            }
          ],
          byAgeRange: [
            {
              $bucket: {
                groupBy: '$age',
                boundaries: [0, 18, 25, 35, 50, 120],
                default: 'Others',
                output: {
                  count: { $sum: 1 }
                }
              }
            }
          ],
          byCreatedMonth: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m',
                    date: '$createdAt'
                  }
                },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { _id: 1 }
            }
          ]
        }
      }
    ]);

    // Handle empty collection gracefully
    if (!result.summary.length) {
      result.summary = [{
        _id: null,
        total: 0,
        avgAge: null,
        minAge: null,
        maxAge: null
      }];
    }

    return {
      summary: result.summary[0],
      byAgeRange: result.byAgeRange,
      byCreatedMonth: result.byCreatedMonth
    };
  }

  async bulkUpsert(users: { email: string; name: string; age?: number }[]) {
    // Deduplicate input by email (keep last occurrence)
    const uniqueUsers = users.reduce((acc, user) => {
      acc.set(user.email.toLowerCase(), user);
      return acc;
    }, new Map<string, typeof users[0]>());

    const operations = Array.from(uniqueUsers.values()).map(user => ({
      updateOne: {
        filter: { emailLower: user.email.toLowerCase() },
        update: {
          $set: {
            name: user.name,
            age: user.age,
            email: user.email,
            emailLower: user.email.toLowerCase(),
          },
          $setOnInsert: {
            createdAt: new Date(),
            isDeleted: false
          }
        },
        upsert: true
      }
    }));

    try {
      const result = await this.userModel.bulkWrite(operations);
      return {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
        errors: []
      };
    } catch (error) {
      return {
        matched: 0,
        modified: 0,
        upserted: 0,
        errors: [error.message]
      };
    }
  }

  // Create single user (case-insensitive email check)
  async create(createUserDto: CreateUserDto): Promise<User> {
    const emailLower = createUserDto.email?.toLowerCase();
    const existing = await this.userModel.findOne({ emailLower }).exec();
    if (existing) throw new ConflictException(`Email "${createUserDto.email}" already exists`);

    const newUser = new this.userModel(createUserDto);
    const saved = await newUser.save();
    const id = saved._id as unknown as { toString(): string };
    return this.findOne(id.toString(), 'basic');
  }

  // Resolve projection based on fields parameter
  private resolveProjection(fields?: 'basic' | 'admin' | string[] | any): Record<string, 0 | 1> {
    const defaultProjection = HIDDEN_FIELDS.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});

    if (!fields) return defaultProjection;
    if (fields === 'basic' || fields === 'admin') return FIELD_PRESETS[fields];
    if (Array.isArray(fields)) return fields.reduce((acc, f) => ({ ...acc, [f]: 1 }), {});
    return defaultProjection;
  }

  // Build MongoDB query from query parameters
  private buildQuery(query: GetUsersQueryDto): Record<string, any> {
    const filter: Record<string, any> = {};
    if (!query.includeDeleted) filter.isDeleted = false;

    if (query.ageIn) filter.age = { $in: query.ageIn };
    if (query.ageNin) filter.age = { ...filter.age, $nin: query.ageNin };
    if (query.nameRegex) {
      try {
        filter.name = { $regex: new RegExp(query.nameRegex), $options: 'i' };
      } catch (err) {
        throw new BadRequestException('Invalid regex pattern');
      }
    }
    if (query.hasPhone !== undefined) filter.phone = { $exists: query.hasPhone };

    return filter;
  }

  // Paginated list using reusable paginate util
  async getUsersWithPagination(query: GetUsersQueryDto): Promise<any> {
    const filter = this.buildQuery(query);
    const projection = this.resolveProjection(query.fields);
    const sort: Record<string, 1 | -1> = {};
    if (query.sortBy) sort[query.sortBy] = query.sortOrder?.toLowerCase() === 'desc' ? -1 : 1;

    return paginate(this.userModel, {
      page: query.page,
      pageSize: query.pageSize,
      sort,
      filter,
      projection,
    });
  }

  // Non-paginated query
  async getUsersByQuery(query: GetUsersQueryDto): Promise<User[]> {
    const filter = this.buildQuery(query);
    const projection = this.resolveProjection(query.fields);
    const users = await this.userModel.find(filter).select(projection).lean();
    return users;
  }

  // Find single user
  async findOne(id: string, fields?: 'basic' | 'admin' | string[]): Promise<User> {
    const projection = this.resolveProjection(fields);
    const user = await this.userModel.findOne({ _id: id, isDeleted: false }).select(projection).lean();
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  // Update user
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updated = await this.userModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateUserDto, { new: true })
      .select(this.resolveProjection('admin'))
      .lean();
    
    if (!updated) throw new NotFoundException(`User with ID ${id} not found`);
    return updated;
  }

  // Soft delete with audit fields
  async softDelete(id: string, deleteDto: DeleteUserDto = {}): Promise<User> {
    const existing = await this.userModel.findById(id).select('isDeleted').lean();
    if (!existing) throw new NotFoundException(`User with ID ${id} not found`);
    if (existing.isDeleted) throw new ConflictException(`User with ID ${id} is already deleted`);

    const deleted = await this.userModel
      .findByIdAndUpdate(
        id,
        { isDeleted: true, deletedAt: new Date(), deletedBy: deleteDto.deletedBy, deleteReason: deleteDto.deleteReason },
        { new: true }
      )
      .select(this.resolveProjection('admin'))
      .lean();

    if (!deleted) throw new NotFoundException(`User with ID ${id} not found`);
    return deleted as User;
  }

  // Restore
  async restore(id: string): Promise<User> {
    const existing = await this.userModel.findById(id).select('isDeleted').lean();
    if (!existing) throw new NotFoundException(`User with ID ${id} not found`);
    if (!existing.isDeleted) throw new ConflictException(`User with ID ${id} is not deleted`);

    const restored = await this.userModel
      .findOneAndUpdate({ _id: id }, { isDeleted: false, deletedAt: null, deletedBy: null, deleteReason: null }, { new: true })
      .select(this.resolveProjection('admin'))
      .lean();
    
    if (!restored) throw new NotFoundException(`User with ID ${id} not found`);
    return restored as User;
  }

  // Bulk create (keeps idempotency by emailLower)
  async bulkCreate(users: CreateUserDto[]): Promise<{ insertedCount: number; skipped: { email: string; reason: string }[] }> {
    const inserted: User[] = [];
    const skipped: { email: string; reason: string }[] = [];
    for (const u of users) {
      const emailLower = u.email?.toLowerCase();
      const exists = await this.userModel.findOne({ emailLower }).exec();
      if (exists) {
        skipped.push({ email: u.email, reason: 'Duplicate email' });
        continue;
      }
      const newUser = new this.userModel(u);
      const saved = await newUser.save();
      const id = saved._id as unknown as { toString(): string };
      inserted.push(await this.findOne(id.toString(), 'basic'));
    }
    return { insertedCount: inserted.length, skipped };
  }

  // Cursor-based pagination (forward-only) using _id as cursor
  async findWithCursor(query: CursorPaginationDto): Promise<{ items: User[]; pageInfo: { endCursor: string | null; hasNextPage: boolean } }> {
    const filter: Record<string, any> = { isDeleted: false };
    if (query.after) {
      if (!Types.ObjectId.isValid(query.after)) throw new BadRequestException('Invalid cursor format');
      filter._id = { $gt: new Types.ObjectId(query.after) };
    }
    const limit = query.limit && Number(query.limit) > 0 ? Number(query.limit) : 20;
    const items = await this.userModel.find(filter).sort({ _id: 1 }).limit(limit + 1).select(this.resolveProjection('basic')).lean();
    const hasNextPage = items.length > limit;
    const results = hasNextPage ? items.slice(0, -1) : items;
    return { 
      items: results, 
      pageInfo: { 
        endCursor: results.length ? results[results.length - 1]._id.toString() : null, 
        hasNextPage 
      } 
    };
  }

  // Text search using $text with score
  async textSearch(dto: SearchUserDto): Promise<{ items: User[] }> {
    const q = dto.q?.trim();
    if (!q) throw new BadRequestException('Query (q) is required');

    // ensure text index exists
    const indexes = await this.userModel.collection.indexes();
    const hasTextIndex = indexes.some(idx => Object.values(idx.key || {}).some(v => v === 'text'));
    if (!hasTextIndex) {
      throw new BadRequestException('Text index not found on users collection. Run scripts/ensure-indexes.ts to create the required text index.');
    }

    const projection: any = { score: { $meta: 'textScore' } };
    const userProjection = this.resolveProjection(dto.fields);
    Object.assign(projection, userProjection || {});
    const limit = dto.limit && Number(dto.limit) > 0 ? Number(dto.limit) : 20;

    const items = await this.userModel
      .find({ $text: { $search: q }, isDeleted: false }, projection)
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();

    return { items };
  }
}