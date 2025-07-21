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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Plus,
  Search,
  Eye,
  Edit,
  Calendar,
  Building2,
  Clock,
  DollarSign,
  Users,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { getAllOrders, updateOrder, type Order } from "@/lib/orders";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Assignment, getAssignmentsByOrder } from "@/lib/assignments";

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  ready_for_review: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  delivered: "bg-purple-100 text-purple-800",
};

const assignmentStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-purple-100 text-purple-800",
};

interface OrderWithAssignments extends Order {
  assignments?: any[];
  assignmentProgress?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
}

export default function OrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithAssignments[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithAssignments[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
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
          await loadOrdersWithAssignments();
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadOrdersWithAssignments = async () => {
    try {
      const ordersData = await getAllOrders();

      // Load assignments for each order
      const ordersWithAssignments = await Promise.all(
        ordersData.map(async (order) => {
          try {
            const assignments = await getAssignmentsByOrder(order.id);
            const assignmentProgress = {
              total: assignments.length,
              pending: assignments.filter(
                (a) => a.status === "pending" || a.status === "approved"
              ).length,
              inProgress: assignments.filter((a) => a.status === "in_progress")
                .length,
              completed: assignments.filter((a) => a.status === "completed")
                .length,
            };

            return {
              ...order,
              assignments,
              assignmentProgress,
            };
          } catch (error) {
            console.error(
              `Error loading assignments for order ${order.id}:`,
              error
            );
            return {
              ...order,
              assignments: [],
              assignmentProgress: {
                total: 0,
                pending: 0,
                inProgress: 0,
                completed: 0,
              },
            };
          }
        })
      );

      setOrders(ordersWithAssignments);
      setFilteredOrders(ordersWithAssignments);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders");
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(term, statusFilter);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    applyFilters(searchTerm, status);
  };

  const applyFilters = (search: string, status: string) => {
    let filtered = orders;

    // Status filter
    if (status !== "all") {
      filtered = filtered.filter((order) => order.status === status);
    }

    // Search filter
    if (search.trim() !== "") {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
          order.clientCompanyName
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          order.notes.toLowerCase().includes(search.toLowerCase()) ||
          order.products.some((product) =>
            product.productName.toLowerCase().includes(search.toLowerCase())
          ) ||
          order.assignments?.some(
            (assignment) =>
              assignment.employeeName
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              assignment.agentName.toLowerCase().includes(search.toLowerCase())
          )
      );
    }

    setFilteredOrders(filtered);
  };

  const handleQuickStatusChange = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    setUpdating(orderId);
    try {
      await updateOrder(orderId, { status: newStatus });
      await loadOrdersWithAssignments(); // Reload to get updated data
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setUpdating(null);
    }
  };

  const getAssignmentProgressColor = (progress: any) => {
    if (progress.total === 0) return "text-gray-500";
    if (progress.completed === progress.total) return "text-green-600";
    if (progress.inProgress > 0) return "text-blue-600";
    return "text-yellow-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Orders Management
            </h1>
            <p className="text-gray-600">
              Manage orders, assignments, and track progress
            </p>
          </div>
          <Link href="/admin/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders by number, company, products, agents, or employees..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ready_for_review">
                      Ready for Review
                    </SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Order Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {order.orderNumber}
                        </h3>
                        <Badge className={statusColors[order.status]}>
                          {order.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Select
                          value={order.status}
                          onValueChange={(value) =>
                            handleQuickStatusChange(
                              order.id,
                              value as Order["status"]
                            )
                          }
                          disabled={updating === order.id}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{order.clientCompanyName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{order.totalQuantity} items</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>${order.totalValue?.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {format(order.dueDate, "MMM dd")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            Created: {format(order.createdAt, "MMM dd")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span
                            className={getAssignmentProgressColor(
                              order.assignmentProgress
                            )}
                          >
                            {order.assignmentProgress?.completed || 0}/
                            {order.assignmentProgress?.total || 0} Tasks
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/orders/${order.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Assignment Progress */}
                  {order.assignments && order.assignments.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Assignment Progress
                        </h4>
                        <div className="flex gap-2">
                          {order.assignmentProgress && (
                            <>
                              {order.assignmentProgress.pending > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-yellow-600 border-yellow-200"
                                >
                                  <Timer className="h-3 w-3 mr-1" />
                                  {order.assignmentProgress.pending} Pending
                                </Badge>
                              )}
                              {order.assignmentProgress.inProgress > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-blue-600 border-blue-200"
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {order.assignmentProgress.inProgress} In
                                  Progress
                                </Badge>
                              )}
                              {order.assignmentProgress.completed > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-green-600 border-green-200"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {order.assignmentProgress.completed} Completed
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {order.assignments
                          .slice(0, 4)
                          .map((assignment: Assignment) => (
                            <div
                              key={assignment.id}
                              className="bg-gray-50 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {assignment.productName}
                                  </span>
                                  <Badge
                                    className={
                                      assignmentStatusColors[assignment.status]
                                    }
                                    variant="outline"
                                  >
                                    {assignment.status
                                      .replace("_", " ")
                                      .toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span>Agent: {assignment.agentName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" />
                                  <span>
                                    Employee: {assignment.employeeName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    Due:{" "}
                                    {format(
                                      assignment.deadline,
                                      "MMM dd, yyyy"
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>

                      {order.assignments.length > 4 && (
                        <div className="mt-3 text-center">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button variant="outline" size="sm">
                              View All {order.assignments.length} Assignments
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Products Summary */}
                  <div className="border-t pt-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {order.products.slice(0, 3).map((product, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {product.productName} ({product.quantity}) - $
                          {product.totalPrice?.toFixed(2)}
                        </Badge>
                      ))}
                      {order.products.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{order.products.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="font-medium">
                        Total Value: ${order.totalValue?.toFixed(2) || "0.00"}
                      </span>
                      {order.totalCost && (
                        <span>
                          Profit: $
                          {(order.totalValue! - order.totalCost).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Teams */}
                  {(order.assignedAgents?.length ||
                    order.assignedEmployees?.length) && (
                    <div className="border-t pt-4">
                      <div className="flex gap-4 text-sm">
                        {order.assignedAgents &&
                          order.assignedAgents.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="text-gray-600">
                                Agents: {order.assignedAgents.length}
                              </span>
                            </div>
                          )}
                        {order.assignedEmployees &&
                          order.assignedEmployees.length > 0 && (
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-green-500" />
                              <span className="text-gray-600">
                                Employees: {order.assignedEmployees.length}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No orders found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "No orders match your search criteria."
                  : "Get started by creating your first order."}
              </p>
              {!searchTerm && (
                <Link href="/admin/orders/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Order
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
