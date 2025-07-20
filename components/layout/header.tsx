"use client";

import { useEffect, useState } from "react";
import { Bell, User, LogOut, Settings, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutUser } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  Package,
  ClipboardList,
  BarChart3,
  Home,
  UserCheck,
  FileText,
} from "lucide-react";
import { getUnreadNotificationCount } from "@/lib/notifications";

interface HeaderProps {
  user: {
    uid: string;
    name: string;
    email: string;
    role: "admin" | "agent" | "employee";
  };
}

const navigationItems = {
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: Home },
    { name: "Companies", href: "/admin/companies", icon: Building2 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Orders", href: "/admin/orders", icon: Package },
    { name: "Approvals", href: "/admin/approvals", icon: UserCheck },
    { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  ],
  agent: [
    { name: "Dashboard", href: "/agent/dashboard", icon: Home },
    { name: "My Orders", href: "/agent/orders", icon: Package },
    { name: "My Employees", href: "/agent/employees", icon: Users },
    { name: "Assignments", href: "/agent/assignments", icon: ClipboardList },
    { name: "Approvals", href: "/agent/approvals", icon: UserCheck },
  ],
  employee: [
    { name: "Dashboard", href: "/employee/dashboard", icon: Home },
    { name: "My Tasks", href: "/employee/tasks", icon: ClipboardList },
    { name: "History", href: "/employee/history", icon: FileText },
  ],
};

export function Header({ user }: HeaderProps) {
  const [notificationCount, setNotificationCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user?.uid) {
      loadNotificationCount();
    }
  }, [user]);

  const loadNotificationCount = async () => {
    try {
      const count = await getUnreadNotificationCount(user.uid);
      setNotificationCount(count);
    } catch (error) {
      console.error("Error loading notification count:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = navigationItems[user.role];

  return (
    <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-gray-900"
        >
          <Building2 className="h-6 w-6 text-blue-600" />
          <span className="text-xl">Auromix</span>
        </Link>

        {/* Navigation Items */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`flex items-center gap-2 px-4 py-2 ${
                    isActive
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{item.name}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Navigation Dropdown */}
        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-white border-gray-200 hover:bg-gray-50"
              >
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white border border-gray-200 shadow-lg"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <DropdownMenuItem
                      className={`hover:bg-gray-50 ${
                        isActive ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </DropdownMenuItem>
                  </Link>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Side - Notifications & User Menu */}
        <div className="flex items-center gap-4">
          <Link href={`/${user.role}/notifications`}>
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-gray-100"
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Badge>
              )}
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white border border-gray-200 shadow-lg"
            >
              <DropdownMenuLabel className="pb-2">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-blue-600 capitalize font-medium">
                      {user.role}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="hover:bg-gray-50">
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-50">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
