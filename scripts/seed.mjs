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

  // 5. Create Standard Tasks & Checklists
  const task1 = await prisma.task.create({
    data: {
      name: 'Daily Office Opening Checklist',
      description: 'Morning shift opening procedures, email inbox review, and CRM updates.',
      instructions: 'Ensure all emails flagged urgent are answered first before updating CRM pipeline.',
      departmentId: deptSupport.id,
      shiftId: shiftMorning.id,
      priority: 'HIGH',
      category: 'Operations',
      startTime: '09:15',
      dueTime: '10:15',
      reminderTime: '09:10',
      repeatFrequency: 'DAILY',
      repeatDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
      requiredCompletion: true,
      allowEarlyCompletion: false,
      isPaused: false,
      checklists: {
        create: [
          { title: 'Check company primary and VIP email inboxes', isRequired: true, sortOrder: 0 },
          { title: 'Check and reply to new client chat inquiries', isRequired: true, sortOrder: 1 },
          { title: 'Update CRM lead statuses and deal notes', isRequired: true, sortOrder: 2 },
          { title: 'Review pending high-priority support tickets', isRequired: true, sortOrder: 3 },
          { title: 'Verify daily morning status report is published', isRequired: true, sortOrder: 4 },
        ],
      },
      assignments: {
        create: [{ userId: empJohn.id }, { userId: empSarah.id }],
      },
      notificationSchedule: {
        create: {
          notificationTime: '09:10',
          message: 'Time to start the Daily Office Opening Checklist! Please review your items.',
          repeatIntervalMinutes: 15,
          maxReminders: 3,
          escalationMinutes: 30,
          isEnabled: true,
        },
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      name: 'Client Follow-up & CRM Synchronization',
      description: 'Engage pending client escalations and synchronize CRM deal activity.',
      instructions: 'Log all call summaries with timestamp and next action date.',
      departmentId: deptSupport.id,
      shiftId: shiftMorning.id,
      priority: 'MEDIUM',
      category: 'Client Care',
      startTime: '11:00',
      dueTime: '12:30',
      reminderTime: '10:55',
      repeatFrequency: 'DAILY',
      repeatDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
      requiredCompletion: true,
      allowEarlyCompletion: true,
      isPaused: false,
      checklists: {
        create: [
          { title: 'Call back 5 designated tier-1 clients', isRequired: true, sortOrder: 0 },
          { title: 'Document feedback notes in CRM ticket threads', isRequired: true, sortOrder: 1 },
          { title: 'Notify account manager if client renewal is at risk', isRequired: false, sortOrder: 2 },
        ],
      },
      assignments: {
        create: [{ userId: empJohn.id }],
      },
      notificationSchedule: {
        create: {
          notificationTime: '10:55',
          message: 'Client Follow-up schedule is beginning. Please update CRM.',
          repeatIntervalMinutes: 20,
          maxReminders: 3,
          escalationMinutes: 40,
          isEnabled: true,
        },
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      name: 'Shift Handover & End-of-Day Performance Report',
      description: 'Compile daily ticket throughput, unresolved blockers, and evening handover.',
      instructions: 'Submit report before punching out to ensure smooth continuity.',
      departmentId: deptOps.id,
      shiftId: shiftMorning.id,
      priority: 'URGENT',
      category: 'Reporting',
      startTime: '16:45',
      dueTime: '17:45',
      reminderTime: '16:30',
      repeatFrequency: 'DAILY',
      repeatDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
      requiredCompletion: true,
      allowEarlyCompletion: false,
      isPaused: false,
      checklists: {
        create: [
          { title: 'Log total tickets resolved and active backlog count', isRequired: true, sortOrder: 0 },
          { title: 'Write handover bulletin for evening shift lead', isRequired: true, sortOrder: 1 },
          { title: 'Verify workstations and secure sensitive documents', isRequired: true, sortOrder: 2 },
        ],
      },
      assignments: {
        create: [{ userId: empJohn.id }, { userId: empSarah.id }],
      },
      notificationSchedule: {
        create: {
          notificationTime: '16:30',
          message: 'Evening handover reminder: Complete your Daily Performance Report before end of shift.',
          repeatIntervalMinutes: 15,
          maxReminders: 2,
          escalationMinutes: 30,
          isEnabled: true,
        },
      },
    },
  });

  const task4 = await prisma.task.create({
    data: {
      name: 'Night Server & Security Infrastructure Audit',
      description: 'Check server logs, disk utilization, database backup status, and security alerts.',
      instructions: 'Immediate escalation to DevOps lead if CPU > 85% or backup fails.',
      departmentId: deptTech.id,
      shiftId: shiftNight.id,
      priority: 'HIGH',
      category: 'Maintenance',
      startTime: '23:30',
      dueTime: '01:00',
      reminderTime: '23:15',
      repeatFrequency: 'DAILY',
      repeatDays: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
      requiredCompletion: true,
      allowEarlyCompletion: true,
      isPaused: false,
      checklists: {
        create: [
          { title: 'Verify automated database snapshot completed', isRequired: true, sortOrder: 0 },
          { title: 'Review Firewall and IDS anomaly logs', isRequired: true, sortOrder: 1 },
          { title: 'Check disk space across production cluster', isRequired: true, sortOrder: 2 },
        ],
      },
      assignments: {
        create: [{ userId: empEmily.id }],
      },
      notificationSchedule: {
        create: {
          notificationTime: '23:15',
          message: 'Night Audit Reminder: Perform infrastructure and security check.',
          repeatIntervalMinutes: 20,
          maxReminders: 2,
          escalationMinutes: 45,
          isEnabled: true,
        },
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
