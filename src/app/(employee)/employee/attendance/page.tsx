import { redirect } from 'next/navigation';

export default function EmployeeAttendanceRedirectPage() {
  redirect('/employee/dashboard');
}
