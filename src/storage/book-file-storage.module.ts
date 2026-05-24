import { Global, Module } from '@nestjs/common';
import { BookFileStorageService } from './book-file-storage.service';

@Global()
@Module({
  providers: [BookFileStorageService],
  exports: [BookFileStorageService],
})
export class BookFileStorageModule {}
