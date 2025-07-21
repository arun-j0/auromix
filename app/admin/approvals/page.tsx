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
import {
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  getAllAssignments,
  approveAssignment,
  rejectAssignment,
  type Assignment,
} from "@/lib/assignments";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ApprovalsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
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
          await loadAssignments();
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    filterAssignments(searchTerm, activeTab);
  }, [assignments, searchTerm, activeTab]);

  const loadAssignments = async () => {
    try {
      const assignmentsData = await getAllAssignments();
      setAssignments(assignmentsData);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast.error("Failed to load assignments");
    }
  };

  const filterAssignments = (searchTerm: string, status: string) => {
    let filtered = assignments;

    // Filter by status
    if (status !== "all") {
      filtered = filtered.filter((assignment) => assignment.status === status);
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (assignment) =>
          assignment.productName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          assignment.orderNumber
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          assignment.agentName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          assignment.employeeName
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssignments(filtered);
  };

  const handleApproval = async (assignmentId: string) => {
    setProcessingId(assignmentId);
    try {
      await approveAssignment(assignmentId, user.uid);
      await loadAssignments();
      toast.success("Assignment approved successfully!");
    } catch (error) {
      console.error("Error approving assignment:", error);
      toast.error("Failed to approve assignment");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejection = async () => {
    if (!selectedAssignment || !rejectionReason.trim()) return;

    setProcessingId(selectedAssignment.id);
    try {
      await rejectAssignment(selectedAssignment.id, rejectionReason);
      await loadAssignments();
      toast.success("Assignment rejected successfully!");
      setSelectedAssignment(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting assignment:", error);
      toast.error("Failed to reject assignment");
    } finally {
      setProcessingId(null);
    }
  };

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

  const getPriorityLevel = (deadline: Date) => {
    const now = new Date();
    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline < 0)
      return { level: "overdue", color: "text-red-600", label: "Overdue" };
    if (daysUntilDeadline <= 3)
      return { level: "urgent", color: "text-orange-600", label: "Urgent" };
    if (daysUntilDeadline <= 7)
      return {
        level: "high",
        color: "text-yellow-600",
        label: "High Priority",
      };
    return { level: "normal", color: "text-green-600", label: "Normal" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approvals...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const counts = {
    all: assignments.length,
    pending: assignments.filter((a) => a.status === "pending").length,
    approved: assignments.filter((a) => a.status === "approved").length,
    rejected: assignments.filter((a) => a.status === "rejected").length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    completed: assignments.filter((a) => a.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Assignment Approvals
            </h1>
            <p className="text-gray-600">
              Review and approve agent assignment requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            {counts.pending > 0 && (
              <Badge
                variant="outline"
                className="bg-yellow-50 text-yellow-700 border-yellow-200"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {counts.pending} Pending Approval
              </Badge>
            )}
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by product, order, agent, or employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-6 bg-white">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Pending ({counts.pending})
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Approved ({counts.approved})
            </TabsTrigger>
            <TabsTrigger
              value="in_progress"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              In Progress ({counts.in_progress})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Completed ({counts.completed})
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Rejected ({counts.rejected})
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              All ({counts.all})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => {
                const priority = getPriorityLevel(assignment.deadline);
                return (
                  <Card
                    key={assignment.id}
                    className="bg-white hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Package className="h-5 w-5 text-gray-500" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {assignment.orderNumber} -{" "}
                              {assignment.productName}
                            </h3>
                            <Badge
                              className={getStatusColor(assignment.status)}
                            >
                              {assignment.status
                                .replace("_", " ")
                                .toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className={priority.color}>
                              {priority.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <div>
                                <p className="font-medium">Agent</p>
                                <p>{assignment.agentName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4" />
                              <div>
                                <p className="font-medium">Employee</p>
                                <p>{assignment.employeeName}</p>
                              </div>
                            </div>
                            <div>
                              <p className="font-medium">Quantity</p>
                              <p>{assignment.quantity}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <div>
                                <p className="font-medium">Deadline</p>
                                <p className={priority.color}>
                                  {format(assignment.deadline, "MMM dd, yyyy")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <div>
                                <p className="font-medium">Requested</p>
                                <p>
                                  {format(assignment.createdAt, "MMM dd, yyyy")}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-2">
                              Product Specifications
                            </p>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-700">
                                {assignment.productSpecs}
                              </p>
                            </div>
                          </div>

                          {assignment && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-600 mb-2">
                                Agent Notes
                              </p>
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                  {assignment.notes}
                                </p>
                              </div>
                            </div>
                          )}

                          {assignment.rejectionReason && (
                            <Alert className="mb-4 bg-red-50 border-red-200">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                <strong>Rejection Reason:</strong>{" "}
                                {assignment.rejectionReason}
                              </AlertDescription>
                            </Alert>
                          )}

                          {assignment.reviewedAt && (
                            <p className="text-xs text-gray-500">
                              Approved:{" "}
                              {format(
                                assignment.reviewedAt,
                                "MMM dd, yyyy 'at' HH:mm"
                              )}{" "}
                              by{" "}
                              {assignment.reviewedBy === user.uid
                                ? "you"
                                : "admin"}
                            </p>
                          )}
                        </div>

                        {assignment.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApproval(assignment.id)}
                              disabled={processingId === assignment.id}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {processingId === assignment.id
                                ? "Approving..."
                                : "Approve"}
                            </Button>
                            <Button
                              onClick={() => setSelectedAssignment(assignment)}
                              disabled={processingId === assignment.id}
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-white border-red-200"
                              size="sm"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredAssignments.length === 0 && (
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No assignments found
                  </h3>
                  <p className="text-gray-600">
                    {activeTab === "pending"
                      ? "No pending approvals at the moment."
                      : searchTerm
                      ? "No assignments match your search criteria."
                      : `No ${activeTab} assignments found.`}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Reject Assignment Dialog */}
      {selectedAssignment && (
        <Dialog
          open={!!selectedAssignment}
          onOpenChange={() => setSelectedAssignment(null)}
        >
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Reject Assignment Request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order & Product</Label>
                <Input
                  id="orderNumber"
                  value={`${selectedAssignment.orderNumber} - ${selectedAssignment.productName}`}
                  className="bg-gray-50"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agentName">Agent</Label>
                  <Input
                    id="agentName"
                    value={selectedAssignment.agentName}
                    className="bg-gray-50"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee</Label>
                  <Input
                    id="employeeName"
                    value={selectedAssignment.employeeName}
                    className="bg-gray-50"
                    readOnly
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Please provide a clear reason for rejecting this assignment request..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedAssignment(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejection}
                disabled={
                  processingId === selectedAssignment.id ||
                  !rejectionReason.trim()
                }
                className="bg-red-600 hover:bg-red-700"
              >
                {processingId === selectedAssignment.id
                  ? "Rejecting..."
                  : "Reject Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
