import { Controller, Get, Post, Body, Param, Put, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { BulkUpsertUsersDto } from './dto/bulk-upsert-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Bulk upsert users
  @Post('bulk-upsert')
  @ApiOperation({ summary: 'Bulk upsert users (idempotent operation)' })
  @ApiResponse({ status: 200, description: 'Returns bulk operation results' })
  bulkUpsert(@Body() dto: BulkUpsertUsersDto) {
    return this.usersService.bulkUpsert(dto.users);
  }

  // Get user statistics
  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics with faceted aggregation' })
  @ApiResponse({ status: 200, description: 'Returns user statistics grouped by different criteria' })
  getStats() {
    return this.usersService.getStats();
  }

  // Create a new user
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Get users (with optional filters, pagination & sorting)
  @Get()
  getUsers(@Query() query: GetUsersQueryDto) {
    // If pagination params exist, use paginated service
    if (query.page || query.pageSize || query.sortBy || query.sortOrder) {
      return this.usersService.getUsersWithPagination(query);
    }

    // Otherwise, use query filters
    return this.usersService.getUsersByQuery(query);
  }

  // Get a single user by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // Update a user
  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  // Soft-delete a user (with optional audit body)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiResponse({ status: 200, description: 'User soft deleted', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User already deleted' })
  remove(@Param('id') id: string, @Body() deleteDto: DeleteUserDto) {
    return this.usersService.softDelete(id, deleteDto);
  }

  // Restore a soft-deleted user
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted user' })
  @ApiResponse({ status: 200, description: 'User restored', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is not deleted' })
  restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }

  // Cursor-based pagination endpoint
  @Get('cursor')
  @ApiOperation({ summary: 'Get users with cursor-based pagination' })
  @ApiResponse({ status: 200, description: 'List of users', type: User, isArray: true })
  async findWithCursor(@Query() query: CursorPaginationDto) {
    return this.usersService.findWithCursor(query);
  }

  // Text search endpoint
  @Get('search')
  @ApiOperation({ 
    summary: 'Search users using full-text search',
    description: 'Search through users using MongoDB text search. Returns results sorted by relevance score.'
  })
  @ApiQuery({ 
    name: 'q', 
    required: true, 
    description: 'Search query string' 
  })
  @ApiQuery({ 
    name: 'fields', 
    required: false, 
    description: 'Fields to include in response (basic, admin, or comma-separated list of field names)' 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Maximum number of results to return (1-100, default: 20)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of matching users sorted by relevance',
    type: User,
    isArray: true 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid query parameters or missing text index' 
  })
  async search(@Query() query: SearchUserDto) {
    return this.usersService.textSearch(query);
  }
}

