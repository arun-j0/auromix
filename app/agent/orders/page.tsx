"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { Package, Search, Calendar, Clock, Eye } from "lucide-react";
import { getOrdersAssignedToAgent, type Order } from "@/lib/orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function AgentOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
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
            await loadOrders(firebaseUser.uid);
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

  const loadOrders = async (agentId: string) => {
    try {
      const ordersData = await getOrdersAssignedToAgent(agentId);
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterOrders(term, activeTab);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    filterOrders(searchTerm, tab);
  };

  const filterOrders = (searchTerm: string, status: string) => {
    let filtered = orders;

    // Filter by status
    if (status !== "all") {
      filtered = filtered.filter((order) => order.status === status);
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.clientCompanyName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.products.some((product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "delivered":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const orderCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    completed: orders.filter((o) => o.status === "completed").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={3} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600">
              Orders assigned to you and your team
            </p>
          </div>
          {/* Agents can't create orders directly, only assignments */}
          {/* <Link href="/agent/orders/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link> */}
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders by number, client, or product..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-5 bg-white">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              All ({orderCounts.all})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Pending ({orderCounts.pending})
            </TabsTrigger>
            <TabsTrigger
              value="processing"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Processing ({orderCounts.processing})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Completed ({orderCounts.completed})
            </TabsTrigger>
            <TabsTrigger
              value="delivered"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Delivered ({orderCounts.delivered})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Orders List */}
            <div className="space-y-4">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order: {order.orderNumber}
                            </h3>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Client
                              </p>
                              <p className="text-sm text-gray-900">
                                {order.clientCompanyName}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Due Date
                              </p>
                              <p className="text-sm text-gray-900">
                                {order.dueDate.toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Products
                              </p>
                              <p className="text-sm text-gray-900">
                                {order.products.length} item
                                {order.products.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">
                              Notes
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {order.notes || "N/A"}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Created: {order.createdAt.toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                Last Updated:{" "}
                                {order.updatedAt.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Link href={`/agent/orders/${order.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No orders found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm
                        ? "No orders match your search criteria."
                        : "No orders have been assigned to you or your team yet."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
