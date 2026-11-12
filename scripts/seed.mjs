import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function hash(pw) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

async function main() {
  console.log('🌱 Initializing clean live database...');

  // 1. Clean existing dummy records in reverse dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.employeeActivityLog.deleteMany({});
  await prisma.notificationLog.deleteMany({});
  await prisma.notificationSchedule.deleteMany({});
  await prisma.checklistCompletion.deleteMany({});
  await prisma.taskChecklist.deleteMany({});
  await prisma.taskInstance.deleteMany({});
  await prisma.taskAssignment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.shiftBreak.deleteMany({});
  await prisma.shiftAttendance.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.employeeProfile.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.holiday.deleteMany({});
  await prisma.companySetting.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleared all dummy and test records.');

  // 2. Create Departments
  const deptTech = await prisma.department.create({
    data: {
      name: 'Technical Support',
      code: 'TECH',
      description: 'Infrastructure monitoring, bug tracking, and incident escalation',
    },
  });

  const deptSupport = await prisma.department.create({
    data: {
      name: 'Customer Support',
      code: 'CS',
      description: 'Customer inquiry resolution, live chat, and onboarding assistance',
    },
  });

  const deptOps = await prisma.department.create({
    data: {
      name: 'Operations & Logistics',
      code: 'OPS',
      description: 'Daily operational management, facility operations, and fulfillment',
    },
  });

  console.log('Created departments.');

  // 3. Create Shifts
  const shiftMorning = await prisma.shift.create({
    data: {
      name: 'Morning Shift',
      startTime: '09:00',
      endTime: '18:00',
      breakDurationMinutes: 60,
      gracePeriodMinutes: 15,
      workingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
      earlyLoginMinutes: 30,
      lateLoginRules: 'Clock-in after 09:15 AM is flagged as late.',
      autoLogoutMinutes: 60,
      isOvernight: false,
      isActive: true,
    },
  });

  const shiftEvening = await prisma.shift.create({
    data: {
      name: 'Evening Shift',
      startTime: '14:00',
      endTime: '23:00',
      breakDurationMinutes: 60,
      gracePeriodMinutes: 15,
      workingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
      earlyLoginMinutes: 30,
      lateLoginRules: 'Clock-in after 02:15 PM is flagged as late.',
      autoLogoutMinutes: 60,
      isOvernight: false,
      isActive: true,
    },
  });

  const shiftNight = await prisma.shift.create({
    data: {
      name: 'Night Shift (Overnight)',
      startTime: '22:00',
      endTime: '07:00',
      breakDurationMinutes: 60,
      gracePeriodMinutes: 15,
      workingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
      earlyLoginMinutes: 30,
      lateLoginRules: 'Clock-in after 10:15 PM is flagged as late.',
      autoLogoutMinutes: 60,
      isOvernight: true,
      isActive: true,
    },
  });

  console.log('Created operational shifts.');

  // 4. Create Single Super Admin Account (No dummy employees)
  const adminPasswordHash = await hash('Admin@2025!');

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@taskshift.com',
      employeeId: 'ADM001',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      profile: {
        create: {
          fullName: 'System Administrator',
          phone: '',
          departmentId: deptTech.id,
          designation: 'Managing Administrator',
          accountStatus: 'ACTIVE',
        },
      },
    },
  });

  console.log('Created live Super Admin account.');

  // 5. Create Standard Daily Operational Checklist with the 7 Core Support Tasks
  const task1 = await prisma.task.create({
    data: {
      name: 'Daily Operational Checklist',
      description: 'Daily operational support checklists and service monitoring.',
      instructions: 'Perform scheduled checks for ticketing, servers, communications, and status pages.',
      priority: 'HIGH',
      category: 'Company Checklist',
      startTime: '09:00',
      dueTime: '18:00',
      reminderTime: '09:10',
      repeatFrequency: 'DAILY',
      repeatDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
      requiredCompletion: true,
      allowEarlyCompletion: true,
      isPaused: false,
      checklists: {
        create: [
          { title: 'Bold Desk - ticket software', isRequired: true, sortOrder: 0, timerMinutes: 10, targetTime: '09:10' },
          { title: 'WP engine', isRequired: true, sortOrder: 1, timerMinutes: 60, targetTime: '10:00' },
          { title: 'Ms teams - A1p tier 1 support new msgs', isRequired: true, sortOrder: 2, timerMinutes: 60, targetTime: '10:00' },
          { title: 'Twillio Tasks - running more than 1 hr', isRequired: true, sortOrder: 3, timerMinutes: 60, targetTime: '10:00' },
          { title: 'outlook - new emails or replies from henry or etc', isRequired: true, sortOrder: 4, timerMinutes: 60, targetTime: '10:00' },
          { title: 'Twilio status page', isRequired: true, sortOrder: 5, timerMinutes: 60, targetTime: '10:00' },
          { title: 'Pantheon status page', isRequired: true, sortOrder: 6, timerMinutes: 60, targetTime: '10:00' },
        ],
      },
    },
  });

  console.log('Created Daily Operational Checklist with the 7 core support tasks.');

  // 6. Seed Clean Company Settings
  await prisma.companySetting.createMany({
    data: [
      { key: 'companyName', value: JSON.stringify('TaskShift Pro') },
      { key: 'timezone', value: JSON.stringify('UTC') },
      { key: 'workingDays', value: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']) },
      { key: 'notificationSoundsEnabled', value: JSON.stringify(true) },
      { key: 'defaultGracePeriodMinutes', value: JSON.stringify(15) },
      { key: 'defaultAutoLogoutMinutes', value: JSON.stringify(60) },
      { key: 'reminderIntervalMinutes', value: JSON.stringify(15) },
      { key: 'taskCategories', value: JSON.stringify(['Company Checklist', 'Operations', 'Technical Support', 'Client Care']) },
    ],
  });

  console.log('✅ Clean live setup completed successfully!');
  console.log('==================================================');
  console.log('LIVE ADMIN CREDENTIALS:');
  console.log('Email / Login ID: admin@taskshift.com (or ADM001)');
  console.log('Password:         Admin@2025!');
  console.log('Role:             SUPER_ADMIN');
  console.log('--------------------------------------------------');
  console.log('Self-Registration: /register is active for new staff');
  console.log('Dummy Data:       0 dummy records in system');
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
