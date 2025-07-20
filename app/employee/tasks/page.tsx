"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import {
  ClipboardList,
  Search,
  Calendar,
  Clock,
  Play,
  CheckCircle,
} from "lucide-react";
import {
  getAssignmentsByEmployee,
  startAssignment,
  completeAssignment,
  type Assignment,
} from "@/lib/assignments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function EmployeeTasksPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("status") || "all";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role !== "employee") {
              router.push("/");
              return;
            }
            setUser({ ...firebaseUser, ...userData });
            await loadAssignments(firebaseUser.uid);
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

  useEffect(() => {
    filterAssignments(searchTerm, activeTab);
  }, [assignments, searchTerm, activeTab]);

  const loadAssignments = async (employeeId: string) => {
    try {
      const assignmentsData = await getAssignmentsByEmployee(employeeId);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/employee/tasks?status=${tab}`, { scroll: false });
  };

  const filterAssignments = (searchTerm: string, status: string) => {
    let filtered = assignments;

    // Filter by status
    if (status !== "all") {
      if (status === "overdue") {
        filtered = filtered.filter((assignment) => {
          const deadline = assignment.deadline;
          return (
            (assignment.status === "approved" ||
              assignment.status === "in_progress" ||
              assignment.status === "pending") &&
            deadline < new Date()
          );
        });
      } else if (status === "pending") {
        filtered = filtered.filter(
          (assignment) =>
            assignment.status === "pending" || assignment.status === "approved"
        );
      } else {
        filtered = filtered.filter(
          (assignment) => assignment.status === status
        );
      }
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
          assignment.productSpecs
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssignments(filtered);
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

  const handleStartTask = async (assignmentId: string) => {
    try {
      await startAssignment(assignmentId);
      await loadAssignments(user.uid); // Reload assignments
      toast({
        title: "Task Started",
        description: "Assignment status updated to In Progress.",
      });
    } catch (error) {
      console.error("Error starting task:", error);
      toast({
        title: "Error",
        description: "Failed to start task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedAssignment) return;

    setIsCompleting(true);
    try {
      await completeAssignment(selectedAssignment.id, completionNotes);
      await loadAssignments(user.uid); // Reload assignments
      toast({
        title: "Task Completed",
        description: "Assignment status updated to Completed.",
      });
      setSelectedAssignment(null);
      setCompletionNotes("");
    } catch (error) {
      console.error("Error completing task:", error);
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const taskCounts = {
    all: assignments.length,
    pending: assignments.filter(
      (a) => a.status === "pending" || a.status === "approved"
    ).length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    completed: assignments.filter((a) => a.status === "completed").length,
    rejected: assignments.filter((a) => a.status === "rejected").length,
    overdue: assignments.filter((a) => {
      const deadline = a.deadline;
      return (
        (a.status === "approved" ||
          a.status === "in_progress" ||
          a.status === "pending") &&
        deadline < new Date()
      );
    }).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={3} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600">View and manage your assigned tasks</p>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks by product, order, or specifications..."
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
              All ({taskCounts.all})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Pending ({taskCounts.pending})
            </TabsTrigger>
            <TabsTrigger
              value="in_progress"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              In Progress ({taskCounts.in_progress})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Completed ({taskCounts.completed})
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Overdue ({taskCounts.overdue})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Tasks List */}
            <div className="space-y-4">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => (
                  <Card
                    key={assignment.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {assignment.productName}
                            </h3>
                            <Badge
                              className={getStatusColor(assignment.status)}
                            >
                              {assignment.status
                                .replace("_", " ")
                                .toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Order
                              </p>
                              <p className="text-sm text-gray-900">
                                {assignment.orderNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Assigned By
                              </p>
                              <p className="text-sm text-gray-900">
                                {assignment.assignedByName}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Quantity
                              </p>
                              <p className="text-sm text-gray-900">
                                {assignment.quantity}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Deadline
                              </p>
                              <p className="text-sm text-gray-900">
                                {assignment.deadline.toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">
                              Specifications
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {assignment.productSpecs}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Assigned:{" "}
                                {assignment.createdAt.toLocaleDateString()}
                              </span>
                            </div>
                            {assignment.startedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Started:{" "}
                                  {assignment.startedAt.toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {assignment.completedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Completed:{" "}
                                  {assignment.completedAt.toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          {assignment.rejectionReason && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-800">
                                <strong>Rejection Reason:</strong>{" "}
                                {assignment.rejectionReason}
                              </p>
                            </div>
                          )}
                          {assignment.notes &&
                            assignment.status === "completed" && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  <strong>Completion Notes:</strong>{" "}
                                  {assignment.notes}
                                </p>
                              </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {(assignment.status === "approved" ||
                            assignment.status === "pending") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-green-500 text-white hover:bg-green-600"
                              onClick={() => handleStartTask(assignment.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {assignment.status === "in_progress" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-purple-500 text-white hover:bg-purple-600"
                              onClick={() => setSelectedAssignment(assignment)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No tasks found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm
                        ? "No tasks match your search criteria."
                        : "You have no tasks assigned to you yet."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Complete Task Dialog */}
      {selectedAssignment && (
        <Dialog
          open={!!selectedAssignment}
          onOpenChange={() => setSelectedAssignment(null)}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Complete Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productName" className="text-right">
                  Product
                </Label>
                <Input
                  id="productName"
                  value={selectedAssignment.productName}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="orderNumber" className="text-right">
                  Order
                </Label>
                <Input
                  id="orderNumber"
                  value={selectedAssignment.orderNumber}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any completion notes here..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="col-span-3"
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
              <Button onClick={handleCompleteTask} disabled={isCompleting}>
                {isCompleting ? "Completing..." : "Mark as Completed"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
