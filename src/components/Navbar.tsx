import { useAppContext } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface NavbarProps {
  subtitle: string;
  username: string;
  actions?: React.ReactNode;
}

export default function Navbar({ subtitle, username, actions }: NavbarProps) {
  const { logout } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-primary text-primary-foreground py-3 px-6 flex justify-between items-center shadow-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🐂</span>
        <div>
          <h1 className="text-xl font-bold leading-tight">BullSpace</h1>
          <p className="text-xs opacity-80">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <span className="text-sm hidden sm:inline">Hello, {username}!</span>
        <Button
          size="sm"
          variant="ghost"
          className="text-primary-foreground hover:bg-primary-foreground/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
