export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type RepeatFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'SPECIFIC_DAYS' | 'CUSTOM';

export type TaskInstanceStatus =
  | 'SCHEDULED'
  | 'UPCOMING'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'COMPLETED_LATE'
  | 'OVERDUE'
  | 'MISSED'
  | 'CANCELLED';

export type ShiftAttendanceStatus =
  | 'ON_TIME'
  | 'LATE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FORGOTTEN_LOGOUT'
  | 'REVIEW_REQUIRED';

export type NotificationType =
  | 'TASK_REMINDER'
  | 'OVERDUE_ALERT'
  | 'SHIFT_START'
  | 'SHIFT_END'
  | 'SYSTEM'
  | 'ESCALATION';

export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export interface AuthUser {
  id: string;
  email: string;
  employeeId: string;
  role: Role;
  fullName: string;
  departmentId?: string | null;
  departmentName?: string | null;
  designation?: string | null;
  assignedShiftId?: string | null;
  avatarUrl?: string | null;
}

export interface ShiftInfo {
  id: string;
  name: string;
  startTime: string; // "09:00"
  endTime: string;   // "18:00"
  breakDurationMinutes: number;
  gracePeriodMinutes: number;
  workingDays: string[];
  earlyLoginMinutes: number;
  lateLoginRules?: string | null;
  autoLogoutMinutes: number;
  isOvernight: boolean;
  isActive: boolean;
}

export interface AttendanceInfo {
  id: string;
  userId: string;
  shiftId?: string | null;
  shiftName?: string | null;
  date: string;
  actualStart: string;
  actualEnd?: string | null;
  expectedEnd?: string | null;
  breakMinutes: number;
  status: ShiftAttendanceStatus;
  isLate: boolean;
  lateMinutes: number;
  totalDurationMinutes: number;
  notes?: string | null;
  flagReason?: string | null;
  activeBreak?: {
    id: string;
    startTime: string;
  } | null;
}

export interface ChecklistItemDTO {
  id: string;
  title: string;
  isRequired: boolean;
  sortOrder: number;
  isCompleted?: boolean;
  completedAt?: string | null;
  comments?: string | null;
  isLate?: boolean;
}

export interface TaskInstanceDTO {
  id: string;
  taskId: string;
  taskName: string;
  description?: string | null;
  instructions?: string | null;
  category: string;
  priority: Priority;
  date: string;
  scheduledStartTime: string;
  scheduledDueTime: string;
  status: TaskInstanceStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  delayMinutes: number;
  employeeComments?: string | null;
  notificationSentAt?: string | null;
  notificationAcknowledgedAt?: string | null;
  checklists: ChecklistItemDTO[];
  totalChecklists: number;
  completedChecklists: number;
  progressPercent: number;
  assignedEmployeeName?: string;
  assignedEmployeeId?: string;
  departmentName?: string;
}

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  taskInstanceId?: string | null;
}

export interface CompanySettingsDTO {
  companyName: string;
  companyLogoUrl?: string;
  timezone: string;
  workingDays: string[];
  notificationSoundsEnabled: boolean;
  reminderIntervalMinutes: number;
  gracePeriodMinutes: number;
  autoLogoutRules: string;
  taskCompletionRules: {
    allowEarlyCompletion: boolean;
    requireAllChecklists: boolean;
    allowLateCompletions: boolean;
  };
  holidayCalendar: Array<{ id: string; name: string; date: string }>;
}

