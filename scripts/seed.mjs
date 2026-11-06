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
  console.log('🌱 Seeding database...');

  // 1. Clean existing records in reverse dependency order
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

  console.log('Cleared existing data.');

  // 2. Create Departments
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

  const deptTech = await prisma.department.create({
    data: {
      name: 'Technical Support',
      code: 'TECH',
      description: 'Infrastructure monitoring, bug tracking, and incident escalation',
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
      workingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
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
      workingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
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
      workingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
      earlyLoginMinutes: 30,
      lateLoginRules: 'Clock-in after 10:15 PM is flagged as late.',
      autoLogoutMinutes: 60,
      isOvernight: true,
      isActive: true,
    },
  });

  console.log('Created shifts (including overnight).');

  // 4. Create Users (Super Admin, Admin, Employees)
  const defaultAdminPass = await hash('admin123');
  const defaultEmpPass = await hash('employee123');

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@company.com',
      employeeId: 'ADM001',
      passwordHash: defaultAdminPass,
      role: 'SUPER_ADMIN',
      isActive: true,
      profile: {
        create: {
          fullName: 'Alexander Wright (Super Admin)',
          phone: '+1-555-0100',
          departmentId: deptOps.id,
          designation: 'Managing Director / System Architect',
          accountStatus: 'ACTIVE',
        },
      },
    },
  });

  // Employee 1: John Doe (Morning Shift, Customer Support)
  const empJohn = await prisma.user.create({
    data: {
      email: 'john.doe@company.com',
      employeeId: 'EMP101',
      passwordHash: defaultEmpPass,
      role: 'EMPLOYEE',
      isActive: true,
      profile: {
        create: {
          fullName: 'John Doe',
          phone: '+1-555-0101',
          departmentId: deptSupport.id,
          designation: 'Senior Support Specialist',
          assignedShiftId: shiftMorning.id,
          weeklyWorkingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
          accountStatus: 'ACTIVE',
        },
      },
    },
  });

  // Employee 2: Sarah Jenkins (Morning Shift, Operations)
  const empSarah = await prisma.user.create({
    data: {
      email: 'sarah.j@company.com',
      employeeId: 'EMP102',
      passwordHash: defaultEmpPass,
      role: 'EMPLOYEE',
      isActive: true,
      profile: {
        create: {
          fullName: 'Sarah Jenkins',
          phone: '+1-555-0102',
          departmentId: deptOps.id,
          designation: 'Operations Coordinator',
          assignedShiftId: shiftMorning.id,
          weeklyWorkingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
          accountStatus: 'ACTIVE',
        },
      },
    },
  });

  // Employee 3: Michael Chen (Evening Shift, Technical Support)
  const empMichael = await prisma.user.create({
    data: {
      email: 'm.chen@company.com',
      employeeId: 'EMP103',
      passwordHash: defaultEmpPass,
      role: 'EMPLOYEE',
      isActive: true,
      profile: {
        create: {
          fullName: 'Michael Chen',
          phone: '+1-555-0103',
          departmentId: deptTech.id,
          designation: 'Technical Support Engineer',
          assignedShiftId: shiftEvening.id,
          weeklyWorkingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
          accountStatus: 'ACTIVE',
        },
      },
    },
  });

  // Employee 4: Emily Davis (Night Shift, Technical Support)
  const empEmily = await prisma.user.create({
    data: {
      email: 'emily.d@company.com',
      employeeId: 'EMP104',
      passwordHash: defaultEmpPass,
      role: 'EMPLOYEE',
      isActive: true,
      profile: {
        create: {
          fullName: 'Emily Davis',
          phone: '+1-555-0104',
          departmentId: deptTech.id,
          designation: 'Night NOC Engineer',
          assignedShiftId: shiftNight.id,
          weeklyWorkingDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
          accountStatus: 'ACTIVE',
        },
      },
    },
  });

  console.log('Created Users & Profiles.');

  // 5. Create Standard Task with the 7 Default Checklist Tasks
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
      repeatDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
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

  console.log('Created tasks and notification schedules.');

  // 6. Seed Company Settings
  await prisma.companySetting.createMany({
    data: [
      { key: 'companyName', value: JSON.stringify('Apex Enterprises Global') },
      { key: 'timezone', value: JSON.stringify('UTC') },
      { key: 'workingDays', value: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']) },
      { key: 'notificationSoundsEnabled', value: JSON.stringify(true) },
      { key: 'defaultGracePeriodMinutes', value: JSON.stringify(15) },
      { key: 'defaultAutoLogoutMinutes', value: JSON.stringify(60) },
      { key: 'reminderIntervalMinutes', value: JSON.stringify(15) },
      { key: 'taskCategories', value: JSON.stringify(['General', 'Operations', 'Client Care', 'Reporting', 'Quality Audit', 'Maintenance']) },
    ],
  });

  // 7. Seed Holidays
  const currentYear = new Date().getFullYear();
  await prisma.holiday.createMany({
    data: [
      { name: "New Year's Day", date: `${currentYear}-01-01`, description: 'Company Holiday' },
      { name: 'Labor Day', date: `${currentYear}-05-01`, description: 'International Workers Day' },
      { name: 'Independence Day', date: `${currentYear}-07-04`, description: 'National Holiday' },
      { name: 'Thanksgiving', date: `${currentYear}-11-26`, description: 'National Holiday' },
      { name: 'Christmas Day', date: `${currentYear}-12-25`, description: 'Company Holiday' },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Credentials for immediate testing:');
  console.log('Super Admin: admin@company.com  (or ADM001) / admin123');
  console.log('Employee 1:  john.doe@company.com (or EMP101) / employee123');
  console.log('Employee 2:  sarah.j@company.com  (or EMP102) / employee123');
  console.log('Employee 3:  m.chen@company.com   (or EMP103) / employee123');
  console.log('Employee 4:  emily.d@company.com   (or EMP104) / employee123');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

