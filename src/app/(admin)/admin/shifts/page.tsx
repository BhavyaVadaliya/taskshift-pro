import { redirect } from 'next/navigation';

export default function ShiftsRedirectPage() {
  redirect('/admin/checklists');
}
