import { Button } from "../ui/Button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import ThemeToggle  from '../ui/ThemeToggle';
import UserMenu from "./UserMenu";
export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? "app-topbar py-3" : "bg-transparent py-5"}`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <ShieldCheck className="h-8 w-8 text-indigo-500" />
          <span className="app-heading text-xl font-bold tracking-tight uppercase">
            PKI Cetficate Management
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-8 text-sm font-medium app-muted">
          <Link to="/" className="hover:text-indigo-400">
            Home
          </Link>
          <Link to="/about" className="hover:text-indigo-400">
            Security Architecture
          </Link>
          <Link to="/contact" className="hover:text-indigo-400">
            Contact
          </Link>
         
          <div className="h-4 w-[1px] bg-[rgb(var(--app-border))]"></div>
          <ThemeToggle />
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Link to="/login" className="hover:text-[rgb(var(--app-heading))]">
                Login
              </Link>
              <Button variant="primary">Get Started</Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
