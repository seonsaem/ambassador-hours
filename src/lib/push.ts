import webpush from 'web-push';
import prisma from './prisma';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:porega030@gmail.com',
    publicKey,
    privateKey
  );
} else {
  console.warn('⚠️ Web Push VAPID keys are not fully configured in environment variables.');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a push notification to all active push subscriptions of a specific user.
 * Invalid or expired subscriptions will be cleaned up automatically from the database.
 */
export async function sendPushNotification(userId: number, payload: PushPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (error: any) {
        console.error(`[WebPush] Failed to send notification to subscription ID ${sub.id}:`, error);
        
        // Remove subscription from DB if it is expired or no longer exists (404/410)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[WebPush] Deleting expired subscription ID ${sub.id}`);
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          }).catch((err) => console.error('[WebPush] Error deleting subscription:', err));
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (err) {
    console.error(`[WebPush] Error sending push to user ${userId}:`, err);
  }
}

/**
 * Sends a push notification to all subscribed users in the service (e.g. for new notice postings).
 */
export async function sendPushToAllUsers(payload: PushPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) return;

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (error: any) {
        console.error(`[WebPush] Failed to send notification to subscription ID ${sub.id}:`, error);
        
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[WebPush] Deleting expired subscription ID ${sub.id}`);
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          }).catch((err) => console.error('[WebPush] Error deleting subscription:', err));
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (err) {
    console.error('[WebPush] Error sending push to all users:', err);
  }
}
