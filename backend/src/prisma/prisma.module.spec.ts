import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('PrismaModule', () => {
  it('exports PrismaService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    const prismaService = module.get(PrismaService);

    expect(prismaService).toBeDefined();
    expect(prismaService).toHaveProperty('$connect');
  });
});
