import { NotConnected } from "@/components/ui/NotConnected";

export default function B2BEnquiriesPage() {
  return (
    <NotConnected
      title="B2B Enquiries"
      description="Manage wholesale and bulk requirement enquiries from businesses."
      missing="The storefront B2B form emails the team instead of saving enquiries, and the API has no enquiries endpoints. Enquiries will appear here once the form posts to the API and GET /api/v1/admin/b2b-enquiries exists."
    />
  );
}
