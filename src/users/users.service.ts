import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}


  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = new this.userModel(createUserDto);
    return newUser.save();
  }


  async findAll(): Promise<User[]> {
    return this.userModel.find({ isDeleted: false }).exec();
  }


  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }


  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      updateUserDto,
      { new: true },
    ).exec();

    if (!updatedUser) throw new NotFoundException(`User with ID ${id} not found`);
    return updatedUser;
  }


  async remove(id: string): Promise<User> {
    const deletedUser = await this.userModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    ).exec();

    if (!deletedUser) throw new NotFoundException(`User with ID ${id} not found`);
    return deletedUser;
  }


  async restore(id: string): Promise<User> {
    const restoredUser = await this.userModel.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true },
    ).exec();

    if (!restoredUser) throw new NotFoundException(`User with ID ${id} not found or not deleted`);
    return restoredUser;
  }
}
