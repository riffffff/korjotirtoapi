# 📘 Panduan Membuat Frontend Korjo Tirto (Next.js)

Panduan langkah-langkah untuk membuat frontend sendiri.

---

## 🚀 Step 1: Setup Project

```bash
cd /home/rifai/korjo_tirto
npx -y create-next-app@latest korjotirto-web
```

**Pilih konfigurasi:**
- TypeScript: **Yes**
- ESLint: **Yes**  
- Tailwind CSS: **Yes**
- `src/` directory: **No** ← Pilih No
- App Router: **Yes**
- Turbopack: **No**
- Customize alias: **No**

```bash
cd korjotirto-web
npm install axios
```

---

## 📁 Step 2: Buat Struktur Folder

```
web/
├── app/
│   ├── page.tsx              # Guest homepage (UI only)
│   ├── layout.tsx
│   ├── globals.css
│   └── admin/
│       ├── login/page.tsx
│       ├── layout.tsx
│       ├── page.tsx
│       ├── customers/page.tsx
│       ├── meter-readings/page.tsx
│       ├── bills/page.tsx
│       ├── audit-logs/page.tsx
│       └── settings/page.tsx
├── components/               # UI components
│   ├── CustomerDetailModal.tsx
│   ├── SecurityPasswordModal.tsx
│   ├── AdminSidebar.tsx
│   └── AdminHeader.tsx
├── services/                 # API call functions
│   ├── customerService.ts
│   ├── billService.ts
│   ├── meterReadingService.ts
│   ├── authService.ts
│   └── auditLogService.ts
├── hooks/                    # Custom hooks (state + logic)
│   ├── useCustomers.ts
│   ├── useBills.ts
│   └── useAuth.ts
├── types/                    # TypeScript interfaces
│   └── index.ts
└── lib/
    └── api.ts
```

> **Best Practice:** Pisahkan kode menjadi 3 layer:
> 1. **Services** → Fungsi API murni (fetch data)
> 2. **Hooks** → State management + memanggil services
> 3. **Components** → UI saja, pakai hooks

---

## ⚙️ Step 3: Buat API Client

**File:** `lib/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // URL backend
});

// Tambahkan token otomatis
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## 📦 Step 3.1: Buat Types

**File:** `types/index.ts`

```typescript
export interface Customer {
  id: number;
  name: string;
  address: string;
  phone: string;
  meterNumber: string;
  latestReading?: number;
  latestBill?: number;
}

export interface Bill {
  id: number;
  period: string;
  currentReading: number;
  usage: number;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
}

export interface MeterReading {
  id: number;
  customerId: number;
  period: string;
  previousReading: number;
  currentReading: number;
  usage: number;
}
```

---

## 📡 Step 3.2: Buat Services (API Functions)

**File:** `services/customerService.ts`

```typescript
import api from '@/lib/api';
import { Customer } from '@/types';

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const res = await api.get('/customers');
    return res.data.data || res.data;
  },

  getById: async (id: number): Promise<Customer> => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  create: async (data: Partial<Customer>) => {
    const res = await api.post('/customers', data);
    return res.data;
  },

  update: async (id: number, data: Partial<Customer>) => {
    const res = await api.patch(`/customers/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },
};
```

**File:** `services/billService.ts`

```typescript
import api from '@/lib/api';
import { Bill } from '@/types';

export const billService = {
  getPending: async (): Promise<Bill[]> => {
    const res = await api.get('/bills/pending');
    return res.data;
  },

  getByCustomer: async (customerId: number): Promise<Bill[]> => {
    const res = await api.get(`/meter-readings/report?customerId=${customerId}`);
    return res.data;
  },

  pay: async (id: number, paidAmount: number) => {
    const res = await api.patch(`/bills/${id}/pay`, { paidAmount });
    return res.data;
  },
};
```

**File:** `services/authService.ts`

```typescript
import api from '@/lib/api';

export const authService = {
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },

  verifyPassword: async (password: string) => {
    const username = localStorage.getItem('username');
    await api.post('/auth/login', { username, password });
    return true;
  },
};
```

---

## 🎣 Step 3.3: Buat Hooks (State + Logic)

**File:** `hooks/useCustomers.ts`

```typescript
'use client';
import { useState, useEffect } from 'react';
import { customerService } from '@/services/customerService';
import { Customer } from '@/types';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (err) {
      setError('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return { customers, loading, error, refetch: fetchCustomers };
}
```

**File:** `hooks/useBills.ts`

```typescript
'use client';
import { useState } from 'react';
import { billService } from '@/services/billService';
import { Bill } from '@/types';

export function useCustomerBills(customerId: number) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const data = await billService.getByCustomer(customerId);
      setBills(data);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  return { bills, loading, fetchBills };
}
```

---

## 🏠 Step 4: Guest Homepage

**File:** `app/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { Customer } from '@/types';
import CustomerDetailModal from '@/components/CustomerDetailModal';

export default function HomePage() {
  const { customers, loading, error } = useCustomers();
  const [selected, setSelected] = useState<Customer | null>(null);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        💧 Korjo Tirto - Daftar Pelanggan
      </h1>
      
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left">No</th>
              <th className="px-4 py-3 text-left">Nama</th>
              <th className="px-4 py-3 text-left">Meter Akhir</th>
              <th className="px-4 py-3 text-left">Tagihan Bulan Ini</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr 
                key={c.id} 
                onClick={() => setSelected(c)}
                className="border-b hover:bg-blue-50 cursor-pointer"
              >
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.latestReading || '-'}</td>
                <td className="px-4 py-3">
                  Rp {(c.latestBill || 0).toLocaleString('id-ID')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <CustomerDetailModal 
          customer={selected} 
          onClose={() => setSelected(null)} 
        />
      )}
    </div>
  );
}
```

---

## 📋 Step 5: Modal Detail Tagihan

**File:** `components/CustomerDetailModal.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function CustomerDetailModal({ customer, onClose }: any) {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    // Fetch all bills untuk customer ini
    api.get(`/meter-readings/report?customerId=${customer.id}`)
      .then(res => setBills(res.data))
      .catch(() => setBills([]));
  }, [customer.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Detail Tagihan: {customer.name}</h2>
          <button onClick={onClose} className="text-gray-500 text-2xl">&times;</button>
        </div>

        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Bulan</th>
              <th className="px-4 py-2 text-left">Meter</th>
              <th className="px-4 py-2 text-left">Pemakaian</th>
              <th className="px-4 py-2 text-left">Tagihan</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b: any) => (
              <tr key={b.id} className="border-b">
                <td className="px-4 py-2">{b.period}</td>
                <td className="px-4 py-2">{b.currentReading}</td>
                <td className="px-4 py-2">{b.usage} m³</td>
                <td className="px-4 py-2">Rp {b.amount?.toLocaleString('id-ID')}</td>
                <td className="px-4 py-2">
                  <span className={b.isPaid ? 'text-green-600' : 'text-red-600'}>
                    {b.isPaid ? '✓ Lunas' : '○ Belum'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 🔐 Step 6: Admin Login

**File:** `app/admin/login/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.access_token);
      router.push('/admin');
    } catch {
      setError('Username atau password salah');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-96">
        <h1 className="text-2xl font-bold text-center mb-6">🔐 Admin Login</h1>
        
        {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4">{error}</div>}
        
        <input
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={e => setForm({...form, username: e.target.value})}
          className="w-full px-4 py-3 border rounded-lg mb-4"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          className="w-full px-4 py-3 border rounded-lg mb-4"
          required
        />
        <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
          Login
        </button>
      </form>
    </div>
  );
}
```

---

## 📊 Step 7: Admin Layout + Sidebar

**File:** `app/admin/layout.tsx`

```tsx
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
```

**File:** `components/AdminSidebar.tsx`

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menu = [
  { name: 'Dashboard', href: '/admin', icon: '📊' },
  { name: 'Pelanggan', href: '/admin/customers', icon: '👥' },
  { name: 'Stand Meter', href: '/admin/meter-readings', icon: '📏' },
  { name: 'Tagihan', href: '/admin/bills', icon: '💵' },
  { name: 'Audit Log', href: '/admin/audit-logs', icon: '📜' },
  { name: 'Pengaturan', href: '/admin/settings', icon: '⚙️' },
];

export default function AdminSidebar() {
  const path = usePathname();
  
  return (
    <aside className="w-64 bg-gray-900 text-white p-4">
      <div className="text-xl font-bold text-center py-4 border-b border-gray-700 mb-4">
        💧 Korjo Tirto
      </div>
      <nav>
        {menu.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 ${
              path === item.href ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

---

## 🔒 Step 8: Security Password Modal

**File:** `components/SecurityPasswordModal.tsx`

Ini modal yang muncul sebelum operasi Create/Update/Delete:

```tsx
'use client';
import { useState } from 'react';
import api from '@/lib/api';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SecurityPasswordModal({ onConfirm, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Verifikasi password dengan mencoba login ulang
      const username = localStorage.getItem('username'); // simpan saat login
      await api.post('/auth/login', { username, password });
      onConfirm();
    } catch {
      setError('Sandi keamanan salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96">
        <h2 className="text-lg font-bold mb-4">🔐 Konfirmasi Sandi Keamanan</h2>
        
        {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-3">{error}</div>}
        
        <input
          type="password"
          placeholder="Masukkan sandi keamanan"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg mb-4"
        />
        
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">
            Batal
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 📝 Step 9: Contoh Penggunaan Security Modal

Contoh di halaman Customers saat menambah data:

```tsx
const [showSecurityModal, setShowSecurityModal] = useState(false);
const [pendingAction, setPendingAction] = useState<() => void>(() => {});

const handleAddCustomer = (data: any) => {
  // Simpan action yang akan dilakukan
  setPendingAction(() => async () => {
    await api.post('/customers', data);
    fetchCustomers(); // refresh data
  });
  // Tampilkan modal konfirmasi
  setShowSecurityModal(true);
};

// Di JSX:
{showSecurityModal && (
  <SecurityPasswordModal
    onConfirm={() => {
      pendingAction();
      setShowSecurityModal(false);
    }}
    onCancel={() => setShowSecurityModal(false)}
  />
)}
```

---

## 🏃 Step 10: Jalankan

**Terminal 1 - Backend:**
```bash
cd /home/rifai/korjo_tirto/korjotirto
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd /home/rifai/korjo_tirto/korjotirto-web
npm run dev -- -p 3001
```

**Akses:**
- Guest: `http://localhost:3001`
- Admin: `http://localhost:3001/admin/login`

---

## ✅ Checklist

- [ ] Step 1: Setup project
- [ ] Step 2: Struktur folder
- [ ] Step 3: API client
- [ ] Step 4: Guest homepage
- [ ] Step 5: Modal detail tagihan
- [ ] Step 6: Admin login
- [ ] Step 7: Admin layout + sidebar
- [ ] Step 8: Security password modal
- [ ] Step 9: Implementasi ke setiap halaman CRUD
- [ ] Step 10: Test semua fitur

---

## 📚 Halaman Lain yang Perlu Dibuat

| Halaman | Fungsi |
|---------|--------|
| `/admin/page.tsx` | Dashboard statistik |
| `/admin/customers/page.tsx` | CRUD pelanggan |
| `/admin/meter-readings/page.tsx` | Input stand meter |
| `/admin/bills/page.tsx` | Kelola tagihan |
| `/admin/audit-logs/page.tsx` | Lihat log aktivitas |
| `/admin/settings/page.tsx` | Edit tarif |

Polanya sama seperti contoh di atas. Gunakan `SecurityPasswordModal` untuk setiap operasi Create, Update, Delete.
