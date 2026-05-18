import { ChevronDown } from "lucide-react";

interface UserProfileProps {
  name?: string;
  role?: string;
}

export function UserProfile({
  name = "User",
  role = "Learner",
}: UserProfileProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <button className="user-profile" aria-label={`Open menu for ${name}`}>
      <div className="user-profile__avatar" aria-hidden="true">
        {initial}
      </div>
      <div className="user-profile__text">
        <span className="user-profile__name">{name}</span>
        <span className="user-profile__role">{role}</span>
      </div>
      <ChevronDown
        size={14}
        className="user-profile__chevron"
        aria-hidden="true"
      />
    </button>
  );
}
