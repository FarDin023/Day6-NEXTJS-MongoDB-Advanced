import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { SearchUserDto } from './dto/search-user.dto';
import { ConfigModule } from '@nestjs/config';

describe('UsersController (Search)', () => {
  let app: INestApplication;
  let usersController: UsersController;
  let usersService: UsersService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/users-test'),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      controllers: [UsersController],
      providers: [UsersService],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    usersController = moduleRef.get<UsersController>(UsersController);
    usersService = moduleRef.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Search Functionality', () => {
    it('should return 400 if search query is empty', async () => {
      const searchDto = new SearchUserDto();
      searchDto.q = '';
      searchDto.limit = 10;

      try {
        await usersController.search(searchDto);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error.message).toBe('Query (q) is required');
      }
    });

    it('should return search results when text index exists', async () => {
      // Create test users
      const testUsers = [
        { name: 'John Developer', email: 'john@example.com', emailLower: 'john@example.com', age: 30 },
        { name: 'Jane Engineer', email: 'jane@example.com', emailLower: 'jane@example.com', age: 28 },
      ];

      // Insert test users
      await usersService.bulkCreate(testUsers);

      // Test search functionality
      const searchDto = new SearchUserDto();
      searchDto.q = 'developer';
      searchDto.limit = 10;

      const result = await usersController.search(searchDto);
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      // Log indexes for debugging
      const indexes = await usersService['userModel'].collection.indexes();
      console.log('Available indexes:', JSON.stringify(indexes, null, 2));
    });

    it('should respect the limit parameter', async () => {
      const searchDto = new SearchUserDto();
      searchDto.q = 'user';
      searchDto.limit = 1;

      const result = await usersController.search(searchDto);
      expect(result.items.length).toBeLessThanOrEqual(1);
    });
  });
});
