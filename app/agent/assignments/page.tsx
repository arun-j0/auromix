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
  ClipboardList,
  Search,
  Plus,
  Calendar,
  Clock,
  User,
  Package,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { getAssignmentsByAgent, type Assignment } from "@/lib/assignments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AgentAssignmentsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
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
          await loadAssignments(firebaseUser.uid);
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

  const loadAssignments = async (agentId: string) => {
    try {
      const assignmentsData = await getAssignmentsByAgent(agentId);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast.error("Failed to load assignments. Please try again.");
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
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
          assignment.employeeName
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle2 className="h-4 w-4" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Waiting for admin approval";
      case "approved":
        return "Approved by admin - Employee can start work";
      case "rejected":
        return "Rejected by admin";
      case "in_progress":
        return "Employee is working on this task";
      case "completed":
        return "Task completed by employee";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const assignmentCounts = {
    all: assignments.length,
    pending: assignments.filter((a) => a.status === "pending").length,
    approved: assignments.filter((a) => a.status === "approved").length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    completed: assignments.filter((a) => a.status === "completed").length,
    rejected: assignments.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Team Assignments
            </h1>
            <p className="text-gray-600">
              Track assignments for your team members
            </p>
          </div>
          <Link href="/agent/assignments/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Assignment
            </Button>
          </Link>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Note:</strong> All assignments require admin approval before
            employees can start working. You can track the status of your
            assignment requests here.
          </AlertDescription>
        </Alert>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search assignments by product, order, or employee..."
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
          <TabsList className="grid w-full grid-cols-6 bg-white">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              All ({assignmentCounts.all})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Pending ({assignmentCounts.pending})
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Approved ({assignmentCounts.approved})
            </TabsTrigger>
            <TabsTrigger
              value="in_progress"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              In Progress ({assignmentCounts.in_progress})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Completed ({assignmentCounts.completed})
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Rejected ({assignmentCounts.rejected})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Assignments List */}
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
                          <div className="flex items-center gap-3 mb-3">
                            <Package className="h-5 w-5 text-gray-500" />
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
                                Order Number
                              </p>
                              <p className="text-sm text-gray-900">
                                {assignment.orderNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Assigned To
                              </p>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-500" />
                                <p className="text-sm text-gray-900">
                                  {assignment.employeeName}
                                </p>
                              </div>
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
                                {format(assignment.deadline, "MMM dd, yyyy")}
                              </p>
                            </div>
                          </div>

                          {/* Status Message */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                              {getStatusIcon(assignment.status)}
                              <span className="text-sm font-medium text-gray-700">
                                {getStatusMessage(assignment.status)}
                              </span>
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

                          {assignment.notes && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-600 mb-2">
                                Assignment Notes
                              </p>
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                  {assignment.notes}
                                </p>
                              </div>
                            </div>
                          )}

                          {assignment.rejectionReason && (
                            <div className="mb-4">
                              <Alert className="bg-red-50 border-red-200">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800">
                                  <strong>Rejection Reason:</strong>{" "}
                                  {assignment.rejectionReason}
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Created:{" "}
                                {format(assignment.createdAt, "MMM dd, yyyy")}
                              </span>
                            </div>
                            {assignment.approvedAt && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>
                                  Approved:{" "}
                                  {format(
                                    assignment.approvedAt,
                                    "MMM dd, yyyy"
                                  )}
                                </span>
                              </div>
                            )}
                            {assignment.startedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Started:{" "}
                                  {format(assignment.startedAt, "MMM dd, yyyy")}
                                </span>
                              </div>
                            )}
                            {assignment.completedAt && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>
                                  Completed:{" "}
                                  {format(
                                    assignment.completedAt,
                                    "MMM dd, yyyy"
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {assignment.status === "pending" && (
                            <Badge
                              variant="outline"
                              className="text-yellow-600 border-yellow-200"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Awaiting Approval
                            </Badge>
                          )}
                          {assignment.status === "approved" && (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-200"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ready to Start
                            </Badge>
                          )}
                          {assignment.status === "rejected" && (
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-200"
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                          {assignment.status === "in_progress" && (
                            <Badge
                              variant="outline"
                              className="text-blue-600 border-blue-200"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              In Progress
                            </Badge>
                          )}
                          {assignment.status === "completed" && (
                            <Badge
                              variant="outline"
                              className="text-purple-600 border-purple-200"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
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
                      No assignments found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm
                        ? "No assignments match your search criteria."
                        : "You haven't created any assignments yet."}
                    </p>
                    {!searchTerm && (
                      <Link href="/agent/assignments/new">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Assignment
                        </Button>
                      </Link>
                    )}
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
