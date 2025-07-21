"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Plus, Trash2, Package } from "lucide-react";
import { createOrder, type OrderProduct } from "@/lib/orders";
import { getActiveCompanies, type Company } from "@/lib/companies";
import { getAllUsers, type User } from "@/lib/users";
import { getActiveProducts, type Product } from "@/lib/products";
import { createAssignment } from "@/lib/assignments";
import { notifyOrderAssigned } from "@/lib/notifications";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

export default function NewOrderPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    clientCompanyId: "",
    clientCompanyName: "",
    dueDate: "",
    deliveryDate: "",
    notes: "",
    specialInstructions: "",
    assignmentType: "none" as "none" | "agent" | "employee",
    assignedAgentId: "",
    assignedEmployeeId: "",
  });
  const [orderProducts, setOrderProducts] = useState<
    Omit<
      OrderProduct,
      | "status"
      | "assignedTo"
      | "assignedBy"
      | "assignmentDate"
      | "completedDate"
      | "deliveredDate"
    >[]
  >([]);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [companiesData, usersData, productsData] = await Promise.all([
        getActiveCompanies(),
        getAllUsers(),
        getActiveProducts(),
      ]);

      setCompanies(companiesData);
      setAgents(
        usersData.filter((user) => user.role === "agent" && user.isActive)
      );
      setEmployees(
        usersData.filter((user) => user.role === "employee" && user.isActive)
      );
      setAvailableProducts(productsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    }
  };

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    setFormData((prev) => ({
      ...prev,
      clientCompanyId: companyId,
      clientCompanyName: company?.name || "",
    }));
  };

  const addProduct = () => {
    setOrderProducts((prev) => [
      ...prev,
      {
        id: uuidv4(),
        productId: "",
        productName: "",
        productType: "sweater",
        quantity: 1,
        specifications: "",
        deadline: new Date(),
        basePrice: 0,
        creationCost: 0,
        totalPrice: 0,
        totalCost: 0,
      },
    ]);
  };

  const removeProduct = (productId: string) => {
    setOrderProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const updateProduct = (productId: string, field: string, value: any) => {
    setOrderProducts((prev) =>
      prev.map((product) => {
        if (product.id === productId) {
          const updatedProduct = { ...product, [field]: value };

          // If product selection changed, update related fields
          if (field === "productId") {
            const selectedProduct = availableProducts.find(
              (p) => p.id === value
            );
            if (selectedProduct) {
              updatedProduct.productName = selectedProduct.name;
              updatedProduct.productType = selectedProduct.type;
              updatedProduct.basePrice = selectedProduct.basePrice;
              updatedProduct.creationCost = selectedProduct.creationCost;
              updatedProduct.totalPrice =
                selectedProduct.basePrice * updatedProduct.quantity;
              updatedProduct.totalCost =
                selectedProduct.creationCost * updatedProduct.quantity;
            }
          }

          // If quantity changed, recalculate totals
          if (field === "quantity") {
            updatedProduct.totalPrice = updatedProduct.basePrice * value;
            updatedProduct.totalCost = updatedProduct.creationCost * value;
          }

          return updatedProduct;
        }
        return product;
      })
    );
  };

  const calculateOrderTotals = () => {
    const totalQuantity = orderProducts.reduce(
      (sum, product) => sum + product.quantity,
      0
    );
    const totalValue = orderProducts.reduce(
      (sum, product) => sum + product.totalPrice,
      0
    );
    const totalCost = orderProducts.reduce(
      (sum, product) => sum + product.totalCost,
      0
    );
    const profit = totalValue - totalCost;

    return { totalQuantity, totalValue, totalCost, profit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.clientCompanyId) {
        throw new Error("Please select a client company");
      }

      if (orderProducts.length === 0) {
        throw new Error("Please add at least one product");
      }

      const invalidProducts = orderProducts.filter(
        (p) => !p.productId || !p.specifications
      );
      if (invalidProducts.length > 0) {
        throw new Error(
          "Please select products and fill in all specifications"
        );
      }

      const { totalQuantity, totalValue, totalCost } = calculateOrderTotals();

      const finalOrderProducts: OrderProduct[] = orderProducts.map(
        (product) => ({
          ...product,
          status: "pending" as const,
        })
      );

      // Create the order
      const order = await createOrder({
        clientCompanyId: formData.clientCompanyId,
        clientCompanyName: formData.clientCompanyName,
        products: finalOrderProducts,
        totalQuantity,
        totalValue,
        totalCost,
        dueDate: new Date(formData.dueDate),
        deliveryDate: new Date(formData.deliveryDate),
        status: "pending",
        notes: formData.notes,
        specialInstructions: formData.specialInstructions,
        createdBy: auth.currentUser?.uid || "",
        assignedAgents:
          formData.assignmentType === "agent" && formData.assignedAgentId
            ? [formData.assignedAgentId]
            : [],
        assignedEmployees:
          formData.assignmentType === "employee" && formData.assignedEmployeeId
            ? [formData.assignedEmployeeId]
            : [],
      });

      // Handle assignments if specified
      if (formData.assignmentType !== "none") {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("User not authenticated");

        for (const product of finalOrderProducts) {
          if (formData.assignmentType === "agent" && formData.assignedAgentId) {
            const agent = agents.find(
              (a) => a.uid === formData.assignedAgentId
            );
            if (agent) {
              await notifyOrderAssigned(agent.uid, {
                id: order.id,
                orderNumber: order.orderNumber,
                productName: product.productName,
              });
            }
          } else if (
            formData.assignmentType === "employee" &&
            formData.assignedEmployeeId
          ) {
            const employee = employees.find(
              (e) => e.uid === formData.assignedEmployeeId
            );
            if (employee) {
              // Direct assignment to employee
              await createAssignment({
                orderId: order.id,
                orderNumber: order.orderNumber,
                productId: product.productId,
                productName: product.productName,
                productSpecs: product.specifications,
                quantity: product.quantity,
                agentId: employee.agentId || "",
                agentName: employee.agentId
                  ? agents.find((a) => a.uid === employee.agentId)?.name || ""
                  : "",
                employeeId: employee.uid,
                employeeName: employee.name,
                assignedBy: currentUser.uid,
                assignedByName: "Admin",
                status: "approved", // Direct admin assignment is auto-approved
                deadline: product.deadline,
                approvedAt: new Date(),
                approvedBy: currentUser.uid,
              });

              await notifyOrderAssigned(employee.uid, {
                id: order.id,
                orderNumber: order.orderNumber,
                productName: product.productName,
              });
            }
          }
        }
      }

      toast.success("Order created successfully");
      router.push("/admin/orders");
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateOrderTotals();

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Create New Order
            </h1>
            <p className="text-gray-600">
              Add a new order for a client company
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>
                Basic information about the order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Client Company *</Label>
                  <Select onValueChange={handleCompanyChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dueDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery Date *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryDate: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Order Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Add any general notes about this order..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialInstructions">
                  Special Instructions
                </Label>
                <Textarea
                  id="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      specialInstructions: e.target.value,
                    }))
                  }
                  placeholder="Add any special instructions for production..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assignment Section */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment (Optional)</CardTitle>
              <CardDescription>
                Assign this order to an agent or employee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assignment Type</Label>
                <Select
                  value={formData.assignmentType}
                  onValueChange={(value: "none" | "agent" | "employee") =>
                    setFormData((prev) => ({
                      ...prev,
                      assignmentType: value,
                      assignedAgentId: "",
                      assignedEmployeeId: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Assignment</SelectItem>
                    <SelectItem value="agent">Assign to Agent</SelectItem>
                    <SelectItem value="employee">Assign to Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.assignmentType === "agent" && (
                <div className="space-y-2">
                  <Label>Select Agent</Label>
                  <Select
                    value={formData.assignedAgentId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        assignedAgentId: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.uid} value={agent.uid}>
                          {agent.name} ({agent.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.assignmentType === "employee" && (
                <div className="space-y-2">
                  <Label>Select Employee</Label>
                  <Select
                    value={formData.assignedEmployeeId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        assignedEmployeeId: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.uid} value={employee.uid}>
                          {employee.name} ({employee.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>
                    Select products from your catalog
                  </CardDescription>
                </div>
                <Button type="button" onClick={addProduct} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {orderProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Product {index + 1}</h4>
                    {orderProducts.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeProduct(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Product *</Label>
                      <Select
                        value={product.productId}
                        onValueChange={(value) =>
                          updateProduct(product.id, "productId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose from catalog" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map((availableProduct) => (
                            <SelectItem
                              key={availableProduct.id}
                              value={availableProduct.id}
                            >
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span>{availableProduct.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  ${availableProduct.basePrice}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(e) =>
                          updateProduct(
                            product.id,
                            "quantity",
                            Number.parseInt(e.target.value) || 1
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  {product.productId && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <p className="font-medium capitalize">
                            {product.productType.replace("_", " ")}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Unit Price:</span>
                          <p className="font-medium">
                            ${product.basePrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Price:</span>
                          <p className="font-medium text-green-600">
                            ${product.totalPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Production Cost:
                          </span>
                          <p className="font-medium">
                            ${product.totalCost.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Product Deadline *</Label>
                    <Input
                      type="date"
                      value={
                        product.deadline instanceof Date
                          ? product.deadline.toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        updateProduct(
                          product.id,
                          "deadline",
                          new Date(e.target.value)
                        )
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Custom Specifications *</Label>
                    <Textarea
                      value={product.specifications}
                      onChange={(e) =>
                        updateProduct(
                          product.id,
                          "specifications",
                          e.target.value
                        )
                      }
                      placeholder="Add custom specifications for this order (colors, sizes, materials, etc.)"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              ))}

              {orderProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="mx-auto h-12 w-12 mb-4" />
                  <p>
                    No products added yet. Click "Add Product" to get started.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          {orderProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {totals.totalQuantity}
                    </div>
                    <div className="text-sm text-gray-600">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${totals.totalValue.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Order Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      ${totals.totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Production Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${totals.profit.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Estimated Profit
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading || orderProducts.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
            <Link href="/admin/orders">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
