import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepo: Repository<Review>,
  ) {}

  findAll() {
    return this.reviewsRepo.find({ relations: ['user', 'book'] });
  }

  create(userId: string, dto: CreateReviewDto) {
    const review = this.reviewsRepo.create({
      rating: dto.rating,
      comment: dto.comment ?? null,
      bookId: dto.bookId,
      userId,
    });
    return this.reviewsRepo.save(review);
  }
}
