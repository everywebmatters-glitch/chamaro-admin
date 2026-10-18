import { NotConnected } from "@/components/ui/NotConnected";

export default function OrdersPage() {
  return (
    <NotConnected
      title="Retail Orders"
      description="View and manage orders placed directly by customers on the website."
      missing="The store cannot take orders yet: checkout does not create orders, and the API has no admin orders endpoint. Orders will be listed here once checkout and GET /api/v1/admin/orders exist."
    />
  );
}
