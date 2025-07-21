"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/header";
import { ArrowLeft, ClipboardList, Package, User } from "lucide-react";
import { createAssignment } from "@/lib/assignments";
import {
  getOrdersAssignedToAgent,
  updateOrder,
  type Order,
  type OrderProduct,
} from "@/lib/orders";
import { getEmployeesByAgent } from "@/lib/users";
import { notifyAssignmentCreated } from "@/lib/notifications";
import Link from "next/link";
import { toast as toastNotify } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

export default function NewAssignmentPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    orderId: "",
    productId: "",
    employeeId: "",
    deadline: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          await loadData(firebaseUser.uid);
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadData = async (agentId: string) => {
    try {
      const [ordersData, employeesData] = await Promise.all([
        getOrdersAssignedToAgent(agentId),
        getEmployeesByAgent(agentId),
      ]);

      // Filter orders to only show those with products that can be assigned
      const assignableOrders = ordersData.filter((order) =>
        order.products.some(
          (product) =>
            product.status === "pending" || product.status === "assigned"
        )
      );

      setOrders(assignableOrders);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const selectedOrder = orders.find((o) => o.id === formData.orderId);
      const selectedProduct = selectedOrder?.products.find(
        (p: OrderProduct) => p.id === formData.productId
      );
      const selectedEmployee = employees.find(
        (e) => e.uid === formData.employeeId
      );

      if (!selectedOrder || !selectedProduct || !selectedEmployee) {
        throw new Error("Please select all required fields");
      }

      // Create the assignment
      const assignment = await createAssignment({
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        productId: selectedProduct.id,
        productName: selectedProduct.productName, // Updated property name
        productSpecs: selectedProduct.specifications,
        quantity: selectedProduct.quantity,
        agentId: user.uid,
        agentName: user.name,
        employeeId: selectedEmployee.uid,
        employeeName: selectedEmployee.name,
        assignedBy: user.uid,
        assignedByName: user.name,
        status: "pending",
        deadline: new Date(formData.deadline),
        notes: formData.notes,
      });

      toastNotify({
        title: "Assignment Created",
        description: `Assignment has been sent for admin approval.`,
      });

      router.push("/agent/assignments");
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast.error(error.message || "Failed to create assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOrder = orders.find((o) => o.id === formData.orderId);
  const selectedProduct = selectedOrder?.products.find(
    (p) => p.id === formData.productId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/agent/assignments">
            <Button variant="outline" size="sm" className="bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Create New Assignment
            </h1>
            <p className="text-gray-600">
              Assign a task to one of your employees
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignment Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Assignment Details
                </CardTitle>
                <CardDescription>
                  Fill in the assignment information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="orderId">Select Order *</Label>
                    <Select
                      value={formData.orderId}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          orderId: value,
                          productId: "",
                        })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select an order" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{order.orderNumber}</span>
                              <span className="text-gray-500">
                                - {order.clientCompanyName}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {orders.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        No orders available for assignment. Orders must be
                        assigned to you first.
                      </p>
                    )}
                  </div>

                  {selectedOrder && (
                    <div>
                      <Label htmlFor="productId">Select Product *</Label>
                      <Select
                        value={formData.productId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, productId: value })
                        }
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {selectedOrder.products
                            .filter(
                              (product) =>
                                product.status === "pending" ||
                                product.status === "assigned"
                            )
                            .map((product: OrderProduct) => (
                              <SelectItem key={product.id} value={product.id}>
                                <div className="flex items-center gap-2">
                                  <span>{product.productName}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Qty: {product.quantity}
                                  </Badge>
                                  <Badge
                                    variant={
                                      product.status === "pending"
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {product.status}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="employeeId">Assign to Employee *</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, employeeId: value })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {employees.map((employee) => (
                          <SelectItem key={employee.uid} value={employee.uid}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{employee.name}</span>
                              <span className="text-gray-500">
                                - {employee.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {employees.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        No employees found. Make sure you have employees
                        assigned to you.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="deadline">Deadline *</Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={formData.deadline}
                      onChange={(e) =>
                        setFormData({ ...formData, deadline: e.target.value })
                      }
                      required
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Add any additional instructions or notes..."
                      className="bg-white"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !formData.orderId ||
                        !formData.productId ||
                        !formData.employeeId ||
                        !formData.deadline
                      }
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmitting ? "Creating..." : "Create Assignment"}
                    </Button>
                    <Link href="/agent/assignments">
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-white"
                      >
                        Cancel
                      </Button>
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Assignment Preview */}
          <div className="space-y-6">
            {selectedOrder && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-medium">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Client</p>
                    <p className="font-medium">
                      {selectedOrder.clientCompanyName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Due Date</p>
                    <p className="font-medium">
                      {format(selectedOrder.dueDate, "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Products</p>
                    <p className="font-medium">
                      {selectedOrder.products.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedProduct && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Product Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Product Name</p>
                    <p className="font-medium">{selectedProduct.productName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium capitalize">
                      {selectedProduct.productType.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="font-medium">{selectedProduct.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Specifications</p>
                    <p className="text-sm text-gray-900">
                      {selectedProduct.specifications}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Product Deadline</p>
                    <p className="font-medium">
                      {format(selectedProduct.deadline, "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge
                      variant={
                        selectedProduct.status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {selectedProduct.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
