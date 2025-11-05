import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Create a new user
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Get users (with optional filters, pagination & sorting)
  @Get()
  getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query() filters?: any,
  ) {
    // If pagination params exist, use paginated service
    if (page || pageSize || sortBy || sortOrder) {
      return this.usersService.getUsersWithPagination({
        page,
        pageSize,
        sortBy,
        sortOrder,
        filters,
      });
    }

    // Otherwise, use query filters
    return this.usersService.getUsersByQuery(filters);
  }

  // Get a single user by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // Update a user
  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  // Soft-delete a user
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.softDelete(id);
  }

  // Restore a soft-deleted user
  @Put(':id/restore')
  restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }
}

