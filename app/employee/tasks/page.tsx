"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Header } from "@/components/layout/header"
import { ClipboardList, Search, Play, CheckCircle, Calendar, Clock, AlertCircle } from "lucide-react"
import { getAssignmentsByEmployee, startAssignment, completeAssignment, type Assignment } from "@/lib/assignments"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function EmployeeTasksPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [completionNotes, setCompletionNotes] = useState("")
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const statusParam = searchParams.get("status")
    if (statusParam) {
      setActiveTab(statusParam)
    }
  }, [searchParams])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.role !== "employee") {
              router.push("/")
              return
            }
            setUser({ ...firebaseUser, ...userData })
            await loadAssignments(firebaseUser.uid)
          } else {
            router.push("/auth/login")
          }
        } catch (error) {
          console.error("Error loading user data:", error)
          router.push("/auth/login")
        }
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadAssignments = async (employeeId: string) => {
    try {
      const assignmentsData = await getAssignmentsByEmployee(employeeId)
      setAssignments(assignmentsData)
      filterAssignments(searchTerm, activeTab, assignmentsData) // Filter initially
    } catch (error) {
      console.error("Error loading assignments:", error)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterAssignments(term, activeTab, assignments)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    filterAssignments(searchTerm, tab, assignments)
  }

  const filterAssignments = (searchTerm: string, status: string, allAssignments: Assignment[]) => {
    let filtered = allAssignments

    // Filter by status
    if (status !== "all") {
      if (status === "overdue") {
        filtered = filtered.filter(
          (assignment) => assignment.deadline < new Date() && assignment.status !== "completed",
        )
      } else {
        filtered = filtered.filter((assignment) => assignment.status === status)
      }
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (assignment) =>
          assignment.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.productSpecs.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredAssignments(filtered)
  }

  const handleStartTask = async (assignment: Assignment) => {
    try {
      await startAssignment(assignment.id)
      toast({
        title: "Task Started",
        description: `You have started working on ${assignment.productName}.`,
      })
      await loadAssignments(user.uid)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleCompleteTask = async () => {
    if (!selectedAssignment) return

    try {
      await completeAssignment(selectedAssignment.id, completionNotes)
      toast({
        title: "Task Completed",
        description: `You have completed ${selectedAssignment.productName}.`,
      })
      setCompletionNotes("")
      setSelectedAssignment(null)
      await loadAssignments(user.uid)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isOverdue = (assignment: Assignment) => {
    return assignment.deadline < new Date() && assignment.status !== "completed"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const assignmentCounts = {
    all: assignments.length,
    pending: assignments.filter((a) => a.status === "pending").length,
    approved: assignments.filter((a) => a.status === "approved").length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    completed: assignments.filter((a) => a.status === "completed").length,
    overdue: assignments.filter((a) => isOverdue(a)).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={2} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600">Manage your assigned tasks and track progress</p>
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-6 bg-white">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              All ({assignmentCounts.all})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Ready ({assignmentCounts.approved})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              In Progress ({assignmentCounts.in_progress})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Completed ({assignmentCounts.completed})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Pending ({assignmentCounts.pending})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Overdue ({assignmentCounts.overdue})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Tasks List */}
            <div className="space-y-4">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => (
                  <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{assignment.productName}</h3>
                            <Badge className={getStatusColor(assignment.status)}>
                              {assignment.status.replace("_", " ").toUpperCase()}
                            </Badge>
                            {isOverdue(assignment) && (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                OVERDUE
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Order</p>
                              <p className="text-sm text-gray-900">{assignment.orderNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Quantity</p>
                              <p className="text-sm text-gray-900">{assignment.quantity}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Agent</p>
                              <p className="text-sm text-gray-900">{assignment.agentName}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Deadline</p>
                              <p
                                className={`text-sm ${isOverdue(assignment) ? "text-red-600 font-medium" : "text-gray-900"}`}
                              >
                                {assignment.deadline.toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Specifications</p>
                            <p className="text-sm text-gray-700">{assignment.productSpecs}</p>
                          </div>

                          {assignment.notes && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-600 mb-1">Notes</p>
                              <p className="text-sm text-gray-700">{assignment.notes}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Assigned: {assignment.createdAt.toLocaleDateString()}</span>
                            </div>
                            {assignment.startedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Started: {assignment.startedAt.toLocaleDateString()}</span>
                              </div>
                            )}
                            {assignment.completedAt && (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                <span>Completed: {assignment.completedAt.toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {assignment.status === "approved" && (
                            <Button
                              onClick={() => handleStartTask(assignment)}
                              className="bg-blue-600 hover:bg-blue-700"
                              size="sm"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}

                          {assignment.status === "in_progress" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  onClick={() => setSelectedAssignment(assignment)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white">
                                <DialogHeader>
                                  <DialogTitle>Complete Task</DialogTitle>
                                  <DialogDescription>
                                    Mark {assignment.productName} as completed. Add any completion notes below.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <Label htmlFor="notes">Completion Notes (Optional)</Label>
                                  <Textarea
                                    id="notes"
                                    placeholder="Add any notes about the completed work..."
                                    value={completionNotes}
                                    onChange={(e) => setCompletionNotes(e.target.value)}
                                    className="bg-white mt-2"
                                  />
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setSelectedAssignment(null)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleCompleteTask} className="bg-green-600 hover:bg-green-700">
                                    Complete Task
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
                    <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                    <p className="text-gray-600">
                      {searchTerm ? "No tasks match your search criteria." : "You don't have any tasks assigned yet."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
