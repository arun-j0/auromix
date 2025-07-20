"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { ClipboardList, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getAssignmentsByEmployee, type Assignment } from "@/lib/assignments";

interface EmployeeStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedToday: number;
  overdueTasks: number;
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmployeeStats>({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedToday: 0,
    overdueTasks: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Assignment[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role !== "employee") {
              router.push("/");
              return;
            }
            setUser({ ...firebaseUser, ...userData });
            await loadDashboardData(firebaseUser.uid);
          } else {
            router.push("/auth/login");
          }
        } catch (error) {
          console.error("Error loading user data:", error);
          router.push("/auth/login");
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadDashboardData = async (employeeId: string) => {
    try {
      const assignments = await getAssignmentsByEmployee(employeeId);

      const pending = assignments.filter(
        (a) => a.status === "approved" || a.status === "pending"
      ).length;
      const inProgress = assignments.filter(
        (a) => a.status === "in_progress"
      ).length;
      const completedToday = assignments.filter((a) => {
        const completedDate = a.completedAt;
        if (!completedDate) return false;
        const today = new Date();
        return (
          completedDate.getDate() === today.getDate() &&
          completedDate.getMonth() === today.getMonth() &&
          completedDate.getFullYear() === today.getFullYear()
        );
      }).length;
      const overdue = assignments.filter((a) => {
        const deadline = a.deadline;
        if (!deadline) return false;
        return (
          (a.status === "approved" ||
            a.status === "in_progress" ||
            a.status === "pending") &&
          deadline < new Date()
        );
      }).length;

      setStats({
        totalTasks: assignments.length,
        pendingTasks: pending,
        inProgressTasks: inProgress,
        completedToday: completedToday,
        overdueTasks: overdue,
      });

      setRecentTasks(assignments.slice(0, 5)); // Show only recent 5 tasks
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const statCards = [
    {
      title: "Total Tasks",
      value: stats.totalTasks,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      href: "/employee/tasks",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: ClipboardList,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      href: "/employee/tasks?status=pending",
    },
    {
      title: "In Progress",
      value: stats.inProgressTasks,
      icon: ClipboardList,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      href: "/employee/tasks?status=in_progress",
    },
    {
      title: "Completed Today",
      value: stats.completedToday,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      href: "/employee/history",
    },
    {
      title: "Overdue Tasks",
      value: stats.overdueTasks,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      href: "/employee/tasks?status=overdue",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={3} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Employee Dashboard
            </h1>
            <p className="text-gray-600">Welcome back, {user.name}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  {stat.href && (
                    <div className="mt-4">
                      <Link href={stat.href}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-transparent"
                        >
                          View Details
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Your latest assigned tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTasks.length > 0 ? (
                recentTasks.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{assignment.productName}</p>
                      <p className="text-sm text-gray-600">
                        Order: {assignment.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        Due: {assignment.deadline.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(assignment.status)}>
                      {assignment.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No recent tasks assigned</p>
                  <Link href="/employee/tasks">
                    <Button>View All Tasks</Button>
                  </Link>
                </div>
              )}
            </div>
            {recentTasks.length > 0 && (
              <div className="mt-4">
                <Link href="/employee/tasks">
                  <Button variant="outline" className="w-full bg-transparent">
                    View All Tasks
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
