import { User } from "lucide-react";

import { PlaceholderPage } from "./PlaceholderPage";

export function ProfilePage() {
  return (
    <PlaceholderPage
      title="Profile"
      description="Your account details, XP level, and learning statistics."
      Icon={User}
    />
  );
}
