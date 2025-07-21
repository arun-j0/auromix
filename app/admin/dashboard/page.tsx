"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
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
  Building2,
  Users,
  Package,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  Plus,
  Clock,
  TrendingUp,
  UserCheck,
  Calendar,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { format, isToday, isPast } from "date-fns";
import { getAllAssignments } from "@/lib/assignments";
import { getAllOrders } from "@/lib/orders";
import { getAllCompanies } from "@/lib/companies";
import { getAllUsers } from "@/lib/users";

interface DashboardStats {
  totalCompanies: number;
  totalUsers: number;
  totalOrders: number;
  pendingApprovals: number;
  activeAssignments: number;
  completedToday: number;
  overdueAssignments: number;
  totalRevenue: number;
  agentCount: number;
  employeeCount: number;
}

interface RecentActivity {
  id: string;
  type: "order" | "assignment" | "approval";
  title: string;
  description: string;
  status: string;
  createdAt: Date;
  priority?: "high" | "medium" | "low";
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalUsers: 0,
    totalOrders: 0,
    pendingApprovals: 0,
    activeAssignments: 0,
    completedToday: 0,
    overdueAssignments: 0,
    totalRevenue: 0,
    agentCount: 0,
    employeeCount: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== "admin") {
            router.push("/");
            return;
          }
          setUser({ ...firebaseUser, ...userData });
          await loadDashboardData();
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      // Load companies
      const companies = await getAllCompanies();

      // Load users with role breakdown
      const users = await getAllUsers();
      const agentCount = users.filter((user) => user.role === "agent").length;
      const employeeCount = users.filter(
        (user) => user.role === "employee"
      ).length;

      // Load orders with revenue calculation
      const orders = await getAllOrders();

      // Load assignments with status breakdown
      const assignments = await getAllAssignments();
      const pendingApprovals = assignments.filter(
        (a) => a.status === "pending"
      );
      const activeAssignments = assignments.filter(
        (a) => a.status === "approved" || a.status === "in_progress"
      );
      const completedToday = assignments.filter(
        (a) => a.completedAt && isToday(a.completedAt)
      );
      const overdueAssignments = assignments.filter(
        (a) => a.deadline && isPast(a.deadline) && a.status !== "completed"
      );

      // Load recent activity
      const recentOrders = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const recentOrdersSnapshot = await getDocs(recentOrders);

      const recentAssignments = query(
        collection(db, "assignments"),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const recentAssignmentsSnapshot = await getDocs(recentAssignments);

      const activity: RecentActivity[] = [];

      // Add recent orders to activity
      recentOrdersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        activity.push({
          id: doc.id,
          type: "order",
          title: `New Order: ${data.orderNumber}`,
          description: `${data.clientCompanyName} - ${
            data.products?.length || 0
          } products`,
          status: data.status || "pending",
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      // Add recent assignments to activity
      recentAssignmentsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const isPending = data.status === "pending";
        const isOverdue = data.deadline && isPast(data.deadline?.toDate());

        activity.push({
          id: doc.id,
          type: "assignment",
          title: `Assignment: ${data.productName}`,
          description: `${data.agentName} → ${data.employeeName}`,
          status: data.status || "pending",
          createdAt: data.createdAt?.toDate() || new Date(),
          priority: isOverdue ? "high" : isPending ? "medium" : "low",
        });
      });

      // Sort activity by date
      activity.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.totalValue || 0),
        0
      );

      setStats({
        totalCompanies: companies.length,
        totalUsers: users.length,
        totalOrders: orders.length,
        pendingApprovals: pendingApprovals.length,
        activeAssignments: activeAssignments.length,
        completedToday: completedToday.length,
        overdueAssignments: overdueAssignments.length,
        totalRevenue,
        agentCount,
        employeeCount,
      });

      setRecentActivity(activity.slice(0, 6));
      setPendingApprovals(pendingApprovals.slice(0, 5));
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "border-l-4 border-red-500 bg-red-50";
      case "medium":
        return "border-l-4 border-yellow-500 bg-yellow-50";
      default:
        return "border-l-4 border-gray-300";
    }
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: "+12.5%",
      changeType: "positive" as const,
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: UserCheck,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      href: "/admin/approvals",
      urgent: stats.pendingApprovals > 0,
    },
    {
      title: "Active Orders",
      value: stats.totalOrders,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      href: "/admin/orders",
    },
    {
      title: "Active Assignments",
      value: stats.activeAssignments,
      icon: ClipboardList,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      href: "/admin/assignments",
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
      value: stats.overdueAssignments,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      urgent: stats.overdueAssignments > 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Welcome back, {user.name}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{stats.agentCount} Agents</span>
              <span>•</span>
              <span>{stats.employeeCount} Employees</span>
              <span>•</span>
              <span>{stats.totalCompanies} Companies</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/approvals">
              <Button variant="outline" className="bg-white">
                <UserCheck className="mr-2 h-4 w-4" />
                Approvals
                {stats.pendingApprovals > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">
                    {stats.pendingApprovals}
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/admin/orders/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className={`hover:shadow-lg transition-shadow ${
                  stat.urgent ? "ring-2 ring-red-200 bg-red-50" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                      {stat.change && (
                        <p
                          className={`text-sm ${
                            stat.changeType === "positive"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          <TrendingUp className="inline h-3 w-3 mr-1" />
                          {stat.change} from last month
                        </p>
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-full ${stat.bgColor} ${
                        stat.urgent ? "animate-pulse" : ""
                      }`}
                    >
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Pending Approvals
                  </CardTitle>
                  <CardDescription>
                    Assignments waiting for your approval
                  </CardDescription>
                </div>
                {stats.pendingApprovals > 0 && (
                  <Badge className="bg-orange-100 text-orange-800">
                    {stats.pendingApprovals} pending
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 border-yellow-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {approval.productName}
                        </p>
                        <p className="text-xs text-gray-600">
                          {approval.agentName} → {approval.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Due: {format(approval.deadline, "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Link href="/admin/approvals">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white"
                          >
                            Review
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircle className="mx-auto h-8 w-8 mb-2" />
                    <p>All caught up! No pending approvals.</p>
                  </div>
                )}
              </div>
              {pendingApprovals.length > 0 && (
                <div className="mt-4">
                  <Link href="/admin/approvals">
                    <Button variant="outline" className="w-full bg-transparent">
                      View All Approvals
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest system activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={`p-3 rounded-lg ${getPriorityColor(
                        activity.priority
                      )}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-600">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(
                              activity.createdAt,
                              "MMM dd, yyyy 'at' HH:mm"
                            )}
                          </p>
                        </div>
                        <Badge
                          className={getStatusColor(activity.status)}
                          variant="outline"
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Calendar className="mx-auto h-8 w-8 mb-2" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/admin/companies/new">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent h-auto p-4"
                >
                  <div className="flex flex-col items-center text-center">
                    <Building2 className="h-6 w-6 mb-2" />
                    <span className="text-sm">Add Company</span>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/users/new">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent h-auto p-4"
                >
                  <div className="flex flex-col items-center text-center">
                    <Users className="h-6 w-6 mb-2" />
                    <span className="text-sm">Add User</span>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/orders/new">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent h-auto p-4"
                >
                  <div className="flex flex-col items-center text-center">
                    <Package className="h-6 w-6 mb-2" />
                    <span className="text-sm">Create Order</span>
                  </div>
                </Button>
              </Link>
              <Link href="/admin/approvals">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent h-auto p-4"
                >
                  <div className="flex flex-col items-center text-center">
                    <UserCheck className="h-6 w-6 mb-2" />
                    <span className="text-sm">Review Approvals</span>
                    {stats.pendingApprovals > 0 && (
                      <Badge className="mt-1 bg-red-500 text-white text-xs">
                        {stats.pendingApprovals}
                      </Badge>
                    )}
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
