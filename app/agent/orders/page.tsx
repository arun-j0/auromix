"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Package, Search, Eye, Calendar, Truck } from "lucide-react";
import {
  getOrdersAssignedToAgent,
  markOrderAsDelivered,
  type Order,
} from "@/lib/orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";

export default function AgentOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== "agent") {
            router.push("/");
            return;
          }
          setUser({ ...firebaseUser, ...userData });
          await loadOrders(firebaseUser.uid);
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
      toast.error("Failed to load orders");
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
            product.productName.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    setFilteredOrders(filtered);
  };

  const handleMarkAsDelivered = async () => {
    if (!selectedOrder || !user) return;

    setIsDelivering(true);
    try {
      await markOrderAsDelivered(selectedOrder.id, user.uid);
      await loadOrders(user.uid);
      toast.success("Order marked as delivered successfully");
      setSelectedOrder(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDelivering(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "ready_for_review":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProductStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-indigo-100 text-indigo-800";
      case "ready_for_review":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-gray-100 text-gray-800";
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
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    completed: orders.filter((o) => o.status === "completed").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600">
              Orders assigned to you for management
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders by number, company, or product..."
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
              value="in_progress"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              In Progress ({orderCounts.in_progress})
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
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {order.orderNumber}
                            </h3>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
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
                                Total Quantity
                              </p>
                              <p className="text-sm text-gray-900">
                                {order.totalQuantity}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Order Value
                              </p>
                              <p className="text-sm text-gray-900">
                                ${order.totalValue?.toFixed(2) || "0.00"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Due Date
                              </p>
                              <p className="text-sm text-gray-900">
                                {format(order.dueDate, "MMM dd, yyyy")}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Delivery Date
                              </p>
                              <p className="text-sm text-gray-900">
                                {format(order.deliveryDate, "MMM dd, yyyy")}
                              </p>
                            </div>
                          </div>

                          {/* Products */}
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-2">
                              Products
                            </p>
                            <div className="space-y-2">
                              {order.products.map((product, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-gray-900">
                                        {product.productName}
                                      </p>
                                      <Badge
                                        className={getProductStatusColor(
                                          product.status
                                        )}
                                        variant="outline"
                                      >
                                        {product.status
                                          .replace("_", " ")
                                          .toUpperCase()}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      Qty: {product.quantity} • $
                                      {product.totalPrice?.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-600 line-clamp-1">
                                      {product.specifications}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-600">
                                      Deadline
                                    </p>
                                    <p className="text-sm text-gray-900">
                                      {format(product.deadline, "MMM dd, yyyy")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Created:{" "}
                                {format(order.createdAt, "MMM dd, yyyy")}
                              </span>
                            </div>
                            {order.deliveredAt && (
                              <div className="flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                <span>
                                  Delivered:{" "}
                                  {format(order.deliveredAt, "MMM dd, yyyy")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {order.status === "completed" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  onClick={() => setSelectedOrder(order)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  <Truck className="h-4 w-4 mr-1" />
                                  Deliver
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white">
                                <DialogHeader>
                                  <DialogTitle>
                                    Mark Order as Delivered
                                  </DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to mark order{" "}
                                    {order.orderNumber} as delivered to{" "}
                                    {order.clientCompanyName}?
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setSelectedOrder(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleMarkAsDelivered}
                                    disabled={isDelivering}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {isDelivering
                                      ? "Delivering..."
                                      : "Mark as Delivered"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
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
                    <p className="text-gray-600">
                      {searchTerm
                        ? "No orders match your search criteria."
                        : "You don't have any orders assigned yet."}
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
