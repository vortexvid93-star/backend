import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import {
  Subscription,
  SubscriptionPeriod,
  SubscriptionStatus,
} from './entities/subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subsRepo: Repository<Subscription>,
  ) {}

  async findForActor(actor: { id: string; role: UserRole }) {
    if (actor.role === UserRole.MEMBER) {
      return this.subsRepo.find({ where: { userId: actor.id }, relations: ['user'] });
    }
    return this.subsRepo.find({ relations: ['user'] });
  }

  async findOneForActor(id: string, actor: { id: string; role: UserRole }) {
    const sub = await this.subsRepo.findOne({
      where: { id },
      relations: ['user', 'payments'],
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }
    if (actor.role === UserRole.MEMBER && sub.userId !== actor.id) {
      throw new ForbiddenException('You can only view your own subscription');
    }
    return sub;
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    const existing = await this.subsRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('This user already has a subscription');
    }
    const startDate = new Date();
    const endDate = this.computeEndDate(startDate, dto.period);
    const entity = this.subsRepo.create({
      userId,
      plan: dto.plan,
      period: dto.period,
      status: SubscriptionStatus.ACTIVE,
      startDate,
      endDate,
      autoRenew: true,
    });
    return this.subsRepo.save(entity);
  }

  private computeEndDate(start: Date, period: SubscriptionPeriod): Date {
    const d = new Date(start.getTime());
    if (period === SubscriptionPeriod.WEEKLY) {
      d.setUTCDate(d.getUTCDate() + 7);
    } else if (period === SubscriptionPeriod.MONTHLY) {
      d.setUTCMonth(d.getUTCMonth() + 1);
    } else {
      d.setUTCFullYear(d.getUTCFullYear() + 1);
    }
    return d;
  }
}
