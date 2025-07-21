"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import {
  ArrowLeft,
  Edit,
  Calendar,
  Building2,
  Clock,
  User,
  FileText,
  Truck,
} from "lucide-react";
import {
  getOrder,
  updateOrder,
  type Order,
  type OrderProduct,
} from "@/lib/orders";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  ready_for_review: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  delivered: "bg-purple-100 text-purple-800",
};

const productStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  ready_for_review: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
};

export default function OrderDetailPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

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
          await loadOrder();
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, orderId]);

  const loadOrder = async () => {
    try {
      const orderData = await getOrder(orderId);
      if (!orderData) {
        router.push("/admin/orders");
        return;
      }
      setOrder(orderData);
    } catch (error) {
      console.error("Error loading order:", error);
      toast.error("Failed to load order");
      router.push("/admin/orders");
    }
  };

  const handleStatusChange = async (newStatus: Order["status"]) => {
    if (!order) return;

    setUpdating(true);
    try {
      await updateOrder(orderId, { status: newStatus });
      setOrder({ ...order, status: newStatus });
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  const handleProductStatusChange = async (
    productId: string,
    newStatus: OrderProduct["status"]
  ) => {
    if (!order) return;

    setUpdating(true);
    try {
      const updatedProducts = order.products.map((product) =>
        product.id === productId ? { ...product, status: newStatus } : product
      );

      // Update overall order status based on product statuses
      let orderStatus: Order["status"] = "pending";
      const allDelivered = updatedProducts.every(
        (p) => p.status === "delivered"
      );
      const allCompleted = updatedProducts.every(
        (p) => p.status === "completed" || p.status === "delivered"
      );
      const anyInProgress = updatedProducts.some(
        (p) => p.status === "in_progress" || p.status === "ready_for_review"
      );

      if (allDelivered) {
        orderStatus = "delivered";
      } else if (allCompleted) {
        orderStatus = "completed";
      } else if (anyInProgress) {
        orderStatus = "in_progress";
      }

      await updateOrder(orderId, {
        products: updatedProducts,
        status: orderStatus,
      });

      setOrder({ ...order, products: updatedProducts, status: orderStatus });
      toast.success("Product status updated successfully");
    } catch (error) {
      console.error("Error updating product status:", error);
      toast.error("Failed to update product status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user || !order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/orders">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {order.orderNumber}
              </h1>
              <p className="text-gray-600">Order Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={order.status}
              onValueChange={handleStatusChange}
              disabled={updating}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="ready_for_review">
                  Ready for Review
                </SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Link href={`/admin/orders/${order.id}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit Order
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Order Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Order Status</CardTitle>
                  <Badge className={statusColors[order.status]}>
                    {order.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {order.totalQuantity}
                    </div>
                    <div className="text-sm text-gray-600">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${order.totalValue?.toFixed(2) || "0.00"}
                    </div>
                    <div className="text-sm text-gray-600">Order Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      ${order.totalCost?.toFixed(2) || "0.00"}
                    </div>
                    <div className="text-sm text-gray-600">Production Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      $
                      {(
                        (order.totalValue || 0) - (order.totalCost || 0)
                      ).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Profit</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.products.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">
                            {product.productName}
                          </h4>
                          <Badge
                            className={productStatusColors[product.status]}
                            variant="outline"
                          >
                            {product.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {product.specifications}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Quantity:</span>
                            <span className="ml-1 font-medium">
                              {product.quantity}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Unit Price:</span>
                            <span className="ml-1 font-medium">
                              ${product.basePrice.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Total:</span>
                            <span className="ml-1 font-medium text-green-600">
                              ${product.totalPrice.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Deadline:</span>
                            <span className="ml-1 font-medium">
                              {format(product.deadline, "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Select
                        value={product.status}
                        onValueChange={(value) =>
                          handleProductStatusChange(
                            product.id,
                            value as OrderProduct["status"]
                          )
                        }
                        disabled={updating}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="in_progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="ready_for_review">
                            Ready for Review
                          </SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notes and Instructions */}
            {(order.notes || order.specialInstructions) && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes & Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.notes && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Order Notes
                      </h4>
                      <p className="text-gray-600">{order.notes}</p>
                    </div>
                  )}
                  {order.specialInstructions && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Special Instructions
                      </h4>
                      <p className="text-gray-600">
                        {order.specialInstructions}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Information */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{order.clientCompanyName}</p>
                    <p className="text-sm text-gray-600">
                      Company ID: {order.clientCompanyId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Due Date</p>
                    <p className="font-medium">
                      {format(order.dueDate, "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Delivery Date</p>
                    <p className="font-medium">
                      {format(order.deliveryDate, "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium">
                      {format(order.createdAt, "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>

                {order.deliveredAt && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Delivered</p>
                      <p className="font-medium">
                        {format(order.deliveredAt, "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Meta */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-mono text-sm">{order.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600">Created By</p>
                    <p className="font-medium">{order.createdBy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
