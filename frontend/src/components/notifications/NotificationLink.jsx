import { Link } from "react-router-dom";

export default function NotificationLink({ notification, onNavigate }) {
  if (!notification.link_id) {
    return <span>{notification.title}</span>;
  }

  return (
    <Link
      to={`/links/${notification.link_id}`}
      onClick={onNavigate}
      className="hover:text-primary transition-colors"
    >
      {notification.title}
    </Link>
  );
}
