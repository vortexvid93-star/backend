import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './entities/book.entity';

@Injectable()
export class CatalogueService {
  constructor(
    @InjectRepository(Book)
    private readonly booksRepo: Repository<Book>,
  ) {}

  findAllBooks() {
    return this.booksRepo.find({
      relations: ['category', 'subCategory'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBook(id: string) {
    const book = await this.booksRepo.findOne({
      where: { id },
      relations: ['category', 'subCategory'],
    });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    return book;
  }

  createBook(dto: CreateBookDto) {
    const book = this.booksRepo.create({
      title: dto.title,
      author: dto.author,
      description: dto.description,
      coverUrl: dto.coverUrl ?? null,
      fileUrl: dto.fileUrl ?? null,
      isbn: dto.isbn ?? null,
      language: dto.language ?? 'fr',
      isDigital: dto.isDigital ?? true,
      stockCount: dto.stockCount ?? 0,
      publishedYear: dto.publishedYear ?? null,
      categoryId: dto.categoryId ?? null,
      subCategoryId: dto.subCategoryId ?? null,
    });
    return this.booksRepo.save(book);
  }

  async updateBook(id: string, dto: UpdateBookDto) {
    const book = await this.findBook(id);
    Object.assign(book, dto);
    return this.booksRepo.save(book);
  }

  async removeBook(id: string) {
    const book = await this.findBook(id);
    await this.booksRepo.remove(book);
    return { deleted: true };
  }
}
