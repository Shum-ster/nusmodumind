import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Name } from './entities/name.entity';
import { NamesModule } from './names/names.module';

@Module({
  imports: [
    NamesModule,
    TypeOrmModule.forRoot({
      type:'postgres',
      host:'localhost',
      port: 5432,
      username:'postgres',
      password:'postgres',
      database:'postgres',
      entities: [Name],
      synchronize:true,
    }),
  ],
  
})
export class AppModule {}