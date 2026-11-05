import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

console.log('🚀 Scheduler Background Daemon started.');
console.log('⏰ Checking every 30 seconds for scheduled task reminders, shift transitions, and overdue tasks...');

async function tick() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/tick`, {
      method: 'POST',
      headers: {
        'x-scheduler-secret': process.env.JWT_SECRET || 'secret',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.notificationsSent > 0 || data.overdueMarked > 0 || data.flaggedLogouts > 0) {
        console.log(`[${new Date().toLocaleTimeString()}] Scheduler result:`, data);
      }
    }
  } catch (err) {
    // If next dev server is still starting up, suppress error
  }
}

// Tick immediately, then repeat every 30s
tick();
setInterval(tick, 30000);
