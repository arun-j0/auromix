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
import {
  Users,
  Package,
  ClipboardList,
  CheckCircle,
  Plus,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { getEmployeesByAgent } from "@/lib/users";
import { getAssignmentsByAgent } from "@/lib/assignments";
import { getOrdersAssignedToAgent } from "@/lib/orders";

interface AgentStats {
  totalEmployees: number;
  activeEmployees: number;
  myOrders: number;
  pendingTasks: number;
  completedToday: number;
  overdueItems: number;
}

export default function AgentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AgentStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    myOrders: 0,
    pendingTasks: 0,
    completedToday: 0,
    overdueItems: 0,
  });
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [myEmployees, setMyEmployees] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role !== "agent") {
              router.push("/");
              return;
            }
            setUser({ ...firebaseUser, ...userData });
            await loadDashboardData(firebaseUser.uid);
          } else {
            router.push("/auth/login"); // User doc not found, redirect to login
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

  const loadDashboardData = async (agentId: string) => {
    try {
      // Load my employees
      const employees = await getEmployeesByAgent(agentId);
      setMyEmployees(employees);

      // Load orders assigned to me
      const ordersAssignedToAgent = await getOrdersAssignedToAgent(agentId);

      // Load assignments for my employees
      const assignmentsData = await getAssignmentsByAgent(agentId);

      // Calculate stats
      const pendingAssignments = assignmentsData.filter(
        (a) =>
          a.status === "pending" ||
          a.status === "approved" ||
          a.status === "in_progress"
      ).length;
      const completedToday = assignmentsData.filter((a) => {
        const completedDate = a.completedAt;
        if (!completedDate) return false;
        const today = new Date();
        return (
          completedDate.getDate() === today.getDate() &&
          completedDate.getMonth() === today.getMonth() &&
          completedDate.getFullYear() === today.getFullYear()
        );
      }).length;

      const overdueItems = assignmentsData.filter((a) => {
        const deadline = a.deadline;
        if (!deadline) return false;
        return a.status !== "completed" && deadline < new Date();
      }).length;

      setStats({
        totalEmployees: employees.length,
        activeEmployees: employees.filter((emp) => emp.isActive).length,
        myOrders: ordersAssignedToAgent.length,
        pendingTasks: pendingAssignments,
        completedToday: completedToday,
        overdueItems: overdueItems,
      });

      setRecentAssignments(assignmentsData.slice(0, 5)); // Show only recent 5 assignments
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // You might want to show a toast or error message to the user here
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const statCards = [
    {
      title: "My Employees",
      value: stats.totalEmployees,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      href: "/agent/employees",
    },
    {
      title: "Active Employees",
      value: stats.activeEmployees,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
      href: "/agent/employees",
    },
    {
      title: "My Orders",
      value: stats.myOrders,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      href: "/agent/orders",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: ClipboardList,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      href: "/agent/assignments",
    },
    {
      title: "Completed Today",
      value: stats.completedToday,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Overdue Items",
      value: stats.overdueItems,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={3} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Agent Dashboard
            </h1>
            <p className="text-gray-600">Welcome back, {user.name}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/agent/employees/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </Link>
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

        {/* Recent Activity and My Team */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
              <CardDescription>
                Latest task assignments to your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAssignments.length > 0 ? (
                  recentAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {assignment.productName || "Task Assignment"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {assignment.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {assignment.createdAt?.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {assignment.status || "Pending"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No recent assignments
                  </p>
                )}
              </div>
              <div className="mt-4">
                <Link href="/agent/assignments">
                  <Button variant="outline" className="w-full bg-transparent">
                    View All Assignments
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Team</CardTitle>
              <CardDescription>Your assigned employees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myEmployees.length > 0 ? (
                  myEmployees.slice(0, 5).map((employee) => (
                    <div
                      key={employee.uid}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {employee.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {employee.email}
                        </p>
                        {employee.skills && employee.skills.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {employee.skills
                              .slice(0, 2)
                              .map((skill: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            {employee.skills.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{employee.skills.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={employee.isActive ? "default" : "secondary"}
                      >
                        {employee.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-4">
                      No employees assigned yet
                    </p>
                    <Link href="/agent/employees/new">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Employee
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
              {myEmployees.length > 0 && (
                <div className="mt-4">
                  <Link href="/agent/employees">
                    <Button variant="outline" className="w-full bg-transparent">
                      View All Employees
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
