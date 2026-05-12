import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../catalogue/entities/book.entity';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Book)
    private readonly booksRepo: Repository<Book>,
    @InjectRepository(Subscription)
    private readonly subsRepo: Repository<Subscription>,
  ) {}

  async summary() {
    const [users, books, activeSubscriptions] = await Promise.all([
      this.usersRepo.count(),
      this.booksRepo.count({ where: { isActive: true } }),
      this.subsRepo.count({ where: { status: SubscriptionStatus.ACTIVE } }),
    ]);
    return { users, books, activeSubscriptions };
  }
}
