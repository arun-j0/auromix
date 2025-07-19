"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { ClipboardList, Search, CheckCircle, XCircle } from "lucide-react"
import { getPendingAssignments, approveAssignment, rejectAssignment, type Assignment } from "@/lib/assignments"
import { notifyAssignmentApproved, notifyAssignmentRejected } from "@/lib/notifications"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"

export default function AdminAssignmentsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.role !== "admin") {
            router.push("/")
            return
          }
          setUser({ ...firebaseUser, ...userData })
          await loadAssignments()
        }
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadAssignments = async () => {
    try {
      const assignmentsData = await getPendingAssignments()
      setAssignments(assignmentsData)
      setFilteredAssignments(assignmentsData)
    } catch (error) {
      console.error("Error loading assignments:", error)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    const filtered = assignments.filter(
      (assignment) =>
        assignment.productName.toLowerCase().includes(term.toLowerCase()) ||
        assignment.employeeName.toLowerCase().includes(term.toLowerCase()) ||
        assignment.agentName.toLowerCase().includes(term.toLowerCase()) ||
        assignment.orderNumber.toLowerCase().includes(term.toLowerCase()),
    )
    setFilteredAssignments(filtered)
  }

  const handleApprove = async (assignment: Assignment) => {
    try {
      await approveAssignment(assignment.id, user.uid)
      await notifyAssignmentApproved(assignment.employeeId, {
        assignmentId: assignment.id,
        productName: assignment.productName,
      })

      toast({
        title: "Assignment Approved",
        description: `Assignment for ${assignment.productName} has been approved.`,
      })

      await loadAssignments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleReject = async (assignment: Assignment) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      })
      return
    }

    try {
      await rejectAssignment(assignment.id, user.uid, rejectionReason)
      await notifyAssignmentRejected(assignment.employeeId, {
        assignmentId: assignment.id,
        productName: assignment.productName,
        reason: rejectionReason,
      })

      toast({
        title: "Assignment Rejected",
        description: `Assignment for ${assignment.productName} has been rejected.`,
      })

      setRejectionReason("")
      await loadAssignments()
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
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assignments...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={5} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assignment Approvals</h1>
            <p className="text-gray-600">Review and approve task assignments</p>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search assignments by product, employee, agent, or order..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Assignments List */}
        <div className="space-y-4">
          {filteredAssignments.length > 0 ? (
            filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{assignment.productName}</h3>
                        <Badge className={getStatusColor(assignment.status)}>{assignment.status.toUpperCase()}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Order</p>
                          <p className="text-sm text-gray-900">{assignment.orderNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Employee</p>
                          <p className="text-sm text-gray-900">{assignment.employeeName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Agent</p>
                          <p className="text-sm text-gray-900">{assignment.agentName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Deadline</p>
                          <p className="text-sm text-gray-900">{assignment.deadline.toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-600 mb-1">Specifications</p>
                        <p className="text-sm text-gray-700">{assignment.productSpecs}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Quantity: {assignment.quantity}</span>
                        <span>Assigned: {assignment.createdAt.toLocaleDateString()}</span>
                        <span>By: {assignment.assignedByName}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleApprove(assignment)}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Assignment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Please provide a reason for rejecting this assignment for {assignment.productName}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4">
                            <Textarea
                              placeholder="Enter rejection reason..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="bg-white"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleReject(assignment)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Reject Assignment
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending assignments</h3>
                <p className="text-gray-600">
                  {searchTerm ? "No assignments match your search criteria." : "All assignments have been reviewed."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
