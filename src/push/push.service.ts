import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Expo, { type ExpoPushMessage } from 'expo-server-sdk';
import * as admin from 'firebase-admin';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private readonly expo = new Expo();
  private fcmReady = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    const serviceAccount = this.loadServiceAccount();
    if (!serviceAccount) {
      this.logger.warn(
        'Firebase service account absent — envoi FCM désactivé (Expo Push reste actif).',
      );
      return;
    }

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
      this.fcmReady = true;
      this.logger.log('Firebase Admin initialisé — envoi FCM actif.');
    } catch (err) {
      this.logger.error(
        'Firebase service account invalide — FCM désactivé.',
        err instanceof Error ? err.message : err,
      );
    }
  }

  private loadServiceAccount(): admin.ServiceAccount | null {
    const inline = this.config
      .get<string>('FIREBASE_SERVICE_ACCOUNT_JSON')
      ?.trim();
    if (inline) {
      return JSON.parse(inline) as admin.ServiceAccount;
    }

    const configuredPath = this.config
      .get<string>('FIREBASE_SERVICE_ACCOUNT_PATH')
      ?.trim();
    const candidates = [
      configuredPath ? resolve(configuredPath) : null,
      resolve(process.cwd(), 'config/firebase-service-account.json'),
    ].filter((p): p is string => Boolean(p));

    for (const filePath of candidates) {
      if (!existsSync(filePath)) continue;
      return JSON.parse(readFileSync(filePath, 'utf8')) as admin.ServiceAccount;
    }

    return null;
  }

  async sendToUser(authId: string, payload: PushPayload): Promise<void> {
    const auth = await this.prisma.auth.findUnique({
      where: { id: authId },
      select: {
        expo_push_token: true,
        fcm_push_token: true,
        push_platform: true,
      },
    });

    if (!auth) return;

    const tasks: Promise<void>[] = [];

    if (auth.fcm_push_token?.trim() && this.fcmReady) {
      tasks.push(this.sendFcm(auth.fcm_push_token, payload));
    }

    if (
      auth.expo_push_token?.trim() &&
      Expo.isExpoPushToken(auth.expo_push_token)
    ) {
      tasks.push(this.sendExpo(auth.expo_push_token, payload));
    }

    if (tasks.length === 0) {
      this.logger.debug(`Aucun token push pour auth ${authId}`);
      return;
    }

    await Promise.allSettled(tasks);
  }

  async sendToMany(authIds: string[], payload: PushPayload): Promise<void> {
    await Promise.allSettled(
      authIds.map((authId) => this.sendToUser(authId, payload)),
    );
  }

  private async sendExpo(token: string, payload: PushPayload): Promise<void> {
    const message: ExpoPushMessage = {
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
      priority: 'high',
      channelId: 'default',
    };

    const chunks = this.expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            this.logger.warn(`Expo push erreur: ${ticket.message}`);
          }
        }
      } catch (err) {
        this.logger.warn(
          'Expo push échec',
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  private async sendFcm(token: string, payload: PushPayload): Promise<void> {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: { channelId: 'default' },
        },
      });
    } catch (err) {
      this.logger.warn(
        'FCM push échec',
        err instanceof Error ? err.message : err,
      );
    }
  }
}
