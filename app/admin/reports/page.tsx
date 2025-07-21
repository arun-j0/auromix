"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Download, TrendingUp, Users, Package, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllUsers } from "@/lib/users";
import { getAllCompanies } from "@/lib/companies";
import { getAllOrders } from "@/lib/orders";

interface ReportData {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  activeCompanies: number;
  averageCompletionTime: number;
  topPerformers: Array<{
    name: string;
    completedTasks: number;
    role: string;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    orders: number;
    completed: number;
  }>;
}

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalCompanies: 0,
    activeCompanies: 0,
    averageCompletionTime: 0,
    topPerformers: [],
    ordersByStatus: [],
    monthlyTrends: [],
  });
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
          await loadReportData();
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadReportData = async () => {
    try {
      // Load orders
      const orders = await getAllOrders();
      // Load users
      const users = await getAllUsers();

      // Load companies
      const companies = await getAllCompanies();

      // Calculate metrics
      const completedOrders = orders.filter(
        (order) => order.status === "completed" || order.status === "delivered"
      );
      const pendingOrders = orders.filter(
        (order) => order.status === "pending" || order.status === "in_progress"
      );
      const activeUsers = users.filter((user) => user.isActive);
      const activeCompanies = companies.filter((company) => company.isActive);

      // Calculate order status distribution
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const ordersByStatus = Object.entries(statusCounts).map(
        ([status, count]) => ({
          status: status.replace("_", " ").toUpperCase(),
          count,
        })
      );

      // Generate mock monthly trends (in real app, this would be calculated from actual data)
      const monthlyTrends = [
        { month: "Jan", orders: 12, completed: 10 },
        { month: "Feb", orders: 18, completed: 15 },
        { month: "Mar", orders: 25, completed: 22 },
        { month: "Apr", orders: 30, completed: 28 },
        { month: "May", orders: 35, completed: 32 },
        {
          month: "Jun",
          orders: orders.length,
          completed: completedOrders.length,
        },
      ];

      // Generate top performers (mock data - in real app, calculate from assignments)
      const topPerformers = users
        .filter((user) => user.role === "employee" || user.role === "agent")
        .slice(0, 5)
        .map((user) => ({
          name: user.name,
          completedTasks: Math.floor(Math.random() * 20) + 5,
          role: user.role,
        }))
        .sort((a, b) => b.completedTasks - a.completedTasks);

      setReportData({
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        totalCompanies: companies.length,
        activeCompanies: activeCompanies.length,
        averageCompletionTime: 5.2, // Mock data - days
        topPerformers,
        ordersByStatus,
        monthlyTrends,
      });
    } catch (error) {
      console.error("Error loading report data:", error);
    }
  };

  const exportReport = (type: string) => {
    // Mock export functionality
    alert(`Exporting ${type} report... (Feature coming soon)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={5} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Reports & Analytics
            </h1>
            <p className="text-gray-600">
              Business insights and performance metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => exportReport("PDF")}
              variant="outline"
              className="bg-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              onClick={() => exportReport("Excel")}
              variant="outline"
              className="bg-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Orders
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {reportData.totalOrders}
                  </p>
                  <p className="text-sm text-green-600">+12% from last month</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Completed Orders
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {reportData.completedOrders}
                  </p>
                  <p className="text-sm text-green-600">
                    {reportData.totalOrders > 0
                      ? Math.round(
                          (reportData.completedOrders /
                            reportData.totalOrders) *
                            100
                        )
                      : 0}
                    % completion rate
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Users
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {reportData.activeUsers}
                  </p>
                  <p className="text-sm text-gray-600">
                    of {reportData.totalUsers} total
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Avg. Completion
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {reportData.averageCompletionTime}
                  </p>
                  <p className="text-sm text-gray-600">days per order</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger
              value="trends"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                  <CardDescription>
                    Current status of all orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.ordersByStatus.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {item.status}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  (item.count / reportData.totalOrders) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>
                    Most productive team members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.topPerformers.map((performer, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {performer.name}
                          </p>
                          <p className="text-sm text-gray-600 capitalize">
                            {performer.role}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">
                            {performer.completedTasks}
                          </p>
                          <p className="text-xs text-gray-500">completed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Order Analytics</CardTitle>
                <CardDescription>
                  Detailed order statistics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <Package className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.totalOrders}
                    </p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                  </div>
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.completedOrders}
                    </p>
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                  <div className="text-center p-6 bg-orange-50 rounded-lg">
                    <Clock className="h-12 w-12 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.pendingOrders}
                    </p>
                    <p className="text-sm text-gray-600">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>
                  Individual and team productivity metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">
                        Completion Rate by Role
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Employees
                          </span>
                          <span className="text-sm font-medium">85%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Agents</span>
                          <span className="text-sm font-medium">92%</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">
                        Average Response Time
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Assignment to Start
                          </span>
                          <span className="text-sm font-medium">2.3 hours</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Completion to Review
                          </span>
                          <span className="text-sm font-medium">4.1 hours</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>
                  Order volume and completion trends over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-6 gap-4">
                    {reportData.monthlyTrends.map((month, index) => (
                      <div key={index} className="text-center">
                        <div className="mb-2">
                          <div className="h-20 bg-gray-100 rounded relative overflow-hidden">
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-b"
                              style={{
                                height: `${(month.orders / 40) * 100}%`,
                              }}
                            ></div>
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-green-600 rounded-b"
                              style={{
                                height: `${(month.completed / 40) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-900">
                          {month.month}
                        </p>
                        <p className="text-xs text-gray-600">
                          {month.orders} orders
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded"></div>
                      <span>Total Orders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-600 rounded"></div>
                      <span>Completed</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
