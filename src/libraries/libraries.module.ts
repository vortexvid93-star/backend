import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BooksModule } from '../books/books.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LibrariesController } from './libraries.controller';
import { LibrariesService } from './libraries.service';

@Module({
  imports: [AuthModule, BooksModule],
  controllers: [LibrariesController],
  providers: [LibrariesService, JwtAuthGuard],
})
export class LibrariesModule {}
