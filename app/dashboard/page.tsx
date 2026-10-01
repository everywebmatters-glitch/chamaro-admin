import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Plus,
  ImageIcon,
  FolderPlus,
  AlertTriangle,
  Handshake,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { Button } from "@/components/ui/Button";
import { dashboardStats, lowStockProducts, mockB2BEnquiries, mockOrders } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

const quickActions = [
  { label: "Add Product", href: "/products/new", icon: Plus },
  { label: "Add Banner", href: "/banners/new", icon: ImageIcon },
  { label: "Add Category", href: "/categories", icon: FolderPlus },
];

export default function DashboardPage() {
  const recentOrders = mockOrders.slice(0, 5);
  const recentEnquiries = mockB2BEnquiries.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Welcome back</h1>
        <p className="mt-1 text-sm text-zinc-500">Here&apos;s what&apos;s happening across retail and B2B today.</p>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Retail</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Products" value={dashboardStats.totalProducts.toString()} change="+4 this week" icon={Package} />
          <StatCard label="Retail Orders" value={dashboardStats.retailOrders.toString()} change="+12% vs last week" icon={ShoppingCart} />
          <StatCard label="Retail Revenue" value={formatCurrency(dashboardStats.retailRevenue)} change="+8.2% vs last week" icon={DollarSign} />
          <StatCard label="Customers" value={dashboardStats.customers.toLocaleString()} change="+38 this week" icon={Users} />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">B2B</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="New B2B Enquiries" value={dashboardStats.newB2bEnquiries.toString()} change="Since yesterday" icon={Handshake} />
          <StatCard label="Active B2B Leads" value={dashboardStats.activeB2bLeads.toString()} change="In progress" trend="up" icon={TrendingUp} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">Quick actions</h2>
            <div className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <Button variant="secondary" className="w-full justify-start" icon={<action.icon className="h-4 w-4" />}>
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Low stock products</h2>
            </div>
            <ul className="flex flex-col divide-y divide-zinc-100">
              {lowStockProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-zinc-700">{product.name}</span>
                  <span className="font-medium text-amber-600">{product.stock} left</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">Recent retail orders</h2>
            <Link href="/orders" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                  <th className="px-5 py-2.5 font-medium">Order</th>
                  <th className="px-5 py-2.5 font-medium">Customer</th>
                  <th className="px-5 py-2.5 font-medium">Total</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium text-zinc-900">{order.id}</td>
                    <td className="px-5 py-3 text-zinc-600">{order.customer}</td>
                    <td className="px-5 py-3 text-zinc-700">{formatCurrency(order.total)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">B2B enquiries</h2>
            <Link href="/b2b-enquiries" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              View all
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-zinc-100">
            {recentEnquiries.map((enquiry) => (
              <li key={enquiry.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-800">{enquiry.companyName}</p>
                  <p className="truncate text-xs text-zinc-400">{enquiry.requirement}</p>
                </div>
                <StatusBadge status={enquiry.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
