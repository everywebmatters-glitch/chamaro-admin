import { NotConnected } from "@/components/ui/NotConnected";

export default function CustomersPage() {
  return (
    <NotConnected
      title="Customers"
      description="Retail customers and B2B business accounts in one place."
      missing="The API has no admin customers endpoint yet (customer accounts exist, but only the customer can read their own). Customers will be listed here once GET /api/v1/admin/customers exists."
    />
  );
}
