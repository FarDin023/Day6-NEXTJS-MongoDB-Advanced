import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  // Create single user
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check for duplicate email
    const existing = await this.userModel.findOne({ email: createUserDto.email }).exec();
    if (existing) throw new ConflictException(`Email "${createUserDto.email}" already exists`);

    const newUser = new this.userModel(createUserDto);
    return newUser.save();
  }

  // Find all non-deleted users
  async findAll(): Promise<User[]> {
    return this.userModel.find({ isDeleted: false }).select('-__v -deletedAt -isDeleted').lean();
  }

  // Find user by ID
  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findOne({ _id: id, isDeleted: false })
      .select('-__v -deletedAt -isDeleted')
      .lean();
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  // Update user
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updated = await this.userModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      updateUserDto,
      { new: true }
    ).select('-__v -deletedAt -isDeleted').lean();

    if (!updated) throw new NotFoundException(`User with ID ${id} not found`);
    return updated;
  }

  // Soft delete user
  async softDelete(id: string): Promise<User> {
    const deleted = await this.userModel.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    ).select('-__v -deletedAt -isDeleted').lean();

    if (!deleted) throw new NotFoundException(`User with ID ${id} not found`);
    return deleted;
  }

  // Restore soft-deleted user
  async restore(id: string): Promise<User> {
    const restored = await this.userModel.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    ).select('-__v -deletedAt -isDeleted').lean();

    if (!restored) throw new NotFoundException(`User with ID ${id} not found or not deleted`);
    return restored;
  }

  // Query with filters
  async getUsersByQuery(filters: any) {
    const { name, email, minAge, maxAge, isDeleted } = filters;
    const query: any = {};

    if (name) query.name = { $regex: name, $options: 'i' };
    if (email) query.email = { $regex: email, $options: 'i' };
    if (minAge) query.age = { ...query.age, $gte: +minAge };
    if (maxAge) query.age = { ...query.age, $lte: +maxAge };
    query.isDeleted = isDeleted !== undefined ? isDeleted === 'true' : false;

    const users = await this.userModel.find(query)
      .select('-__v -deletedAt -isDeleted')
      .lean();

    return { success: true, message: 'Users filtered successfully', data: users };
  }

  // Pagination & Sorting
  async getUsersWithPagination({
    page = '1',
    pageSize = '10',
    sortBy = 'createdAt',
    sortOrder = 'asc',
    filters = {}
  }: any) {
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Reuse query filters
    const mongoFilter: any = { isDeleted: false };
    if (filters.name) mongoFilter.name = { $regex: filters.name, $options: 'i' };
    if (filters.email) mongoFilter.email = { $regex: filters.email, $options: 'i' };
    if (filters.minAge) mongoFilter.age = { ...mongoFilter.age, $gte: +filters.minAge };
    if (filters.maxAge) mongoFilter.age = { ...mongoFilter.age, $lte: +filters.maxAge };
    if (filters.isDeleted !== undefined) mongoFilter.isDeleted = filters.isDeleted === 'true';

    const total = await this.userModel.countDocuments(mongoFilter);

    const users = await this.userModel.find(mongoFilter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v -deletedAt -isDeleted')
      .lean();

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      meta: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    };
  }

  // Bulk create (skip duplicates)
  async bulkCreate(users: CreateUserDto[]) {
    const inserted: User[] = [];
    const skipped: { email: string; reason: string }[] = [];

    for (const user of users) {
      const exists = await this.userModel.findOne({ email: user.email }).exec();
      if (exists) {
        skipped.push({ email: user.email, reason: 'Duplicate email' });
        continue;
      }
      const newUser = new this.userModel(user);
      inserted.push(await newUser.save());
    }

    return { insertedCount: inserted.length, skipped };
  }
}
