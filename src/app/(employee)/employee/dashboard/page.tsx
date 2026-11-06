import { redirect } from 'next/navigation';

export default function EmployeeDashboardRedirectPage() {
  redirect('/employee/tasks');
}
