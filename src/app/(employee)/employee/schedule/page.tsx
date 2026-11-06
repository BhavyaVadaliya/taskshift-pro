import { redirect } from 'next/navigation';

export default function EmployeeScheduleRedirectPage() {
  redirect('/employee/tasks');
}
