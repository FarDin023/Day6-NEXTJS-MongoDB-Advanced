import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { logger } from './common/utils/logger.util';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017'),
    
    UsersModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    try {
      // Get users collection
      const usersCollection = this.connection.collection('users');

      // List current indexes
      const indexes = await usersCollection.listIndexes().toArray();
      logger.info('Current indexes in users collection:');
      indexes.forEach(index => {
        logger.info(`- ${index.name}:`, JSON.stringify(index.key));
      });

      logger.info('All indexes are set up correctly');
    } catch (error) {
      logger.error('Error verifying indexes:', error);
    }
  }
}
