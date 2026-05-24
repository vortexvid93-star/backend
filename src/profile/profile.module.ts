import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [AuthModule, ChallengesModule, DiscoveryModule],
  controllers: [ProfileController],
  providers: [ProfileService, JwtAuthGuard],
})
export class ProfileModule {}
