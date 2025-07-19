"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, collection, getDocs, query, orderBy, updateDoc, Timestamp } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { UserCheck, Clock, CheckCircle, XCircle, User, Calendar } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Assignment {
  id: string
  orderId: string
  orderNumber: string
  productId: string
  productName: string
  agentId: string
  agentName: string
  employeeId: string
  employeeName: string
  status: "pending" | "approved" | "rejected"
  requestedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  rejectionReason?: string
  deadline: Date
}

export default function ApprovalsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [activeTab, setActiveTab] = useState("pending")
  const [processingId, setProcessingId] = useState<string | null>(null)
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
      const assignmentsQuery = query(collection(db, "assignments"), orderBy("requestedAt", "desc"))
      const assignmentsSnapshot = await getDocs(assignmentsQuery)

      const assignmentsData = assignmentsSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt.toDate(),
          reviewedAt: data.reviewedAt ? data.reviewedAt.toDate() : undefined,
          deadline: data.deadline.toDate(),
        } as Assignment
      })

      setAssignments(assignmentsData)
    } catch (error) {
      console.error("Error loading assignments:", error)
    }
  }

  const handleApproval = async (assignmentId: string, action: "approved" | "rejected", reason?: string) => {
    setProcessingId(assignmentId)
    try {
      const updateData: any = {
        status: action,
        reviewedAt: Timestamp.fromDate(new Date()),
        reviewedBy: user.uid,
      }

      if (action === "rejected" && reason) {
        updateData.rejectionReason = reason
      }

      await updateDoc(doc(db, "assignments", assignmentId), updateData)
      await loadAssignments()
    } catch (error) {
      console.error("Error updating assignment:", error)
    } finally {
      setProcessingId(null)
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

  const filteredAssignments = assignments.filter((assignment) => {
    if (activeTab === "all") return true
    return assignment.status === activeTab
  })

  const counts = {
    all: assignments.length,
    pending: assignments.filter((a) => a.status === "pending").length,
    approved: assignments.filter((a) => a.status === "approved").length,
    rejected: assignments.filter((a) => a.status === "rejected").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approvals...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Approvals</h1>
            <p className="text-gray-600">Review and approve agent assignment requests</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              {counts.pending} Pending
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 bg-white">
            <TabsTrigger value="pending" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Pending ({counts.pending})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Approved ({counts.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Rejected ({counts.rejected})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              All ({counts.all})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <Card key={assignment.id} className="bg-white hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assignment.orderNumber} - {assignment.productName}
                          </h3>
                          <Badge className={getStatusColor(assignment.status)}>{assignment.status.toUpperCase()}</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Agent: {assignment.agentName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Employee: {assignment.employeeName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Deadline: {assignment.deadline.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Requested: {assignment.requestedAt.toLocaleDateString()}</span>
                          </div>
                        </div>

                        {assignment.rejectionReason && (
                          <Alert className="mt-3">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Rejection Reason:</strong> {assignment.rejectionReason}
                            </AlertDescription>
                          </Alert>
                        )}

                        {assignment.reviewedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reviewed: {assignment.reviewedAt.toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {assignment.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApproval(assignment.id, "approved")}
                            disabled={processingId === assignment.id}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              const reason = prompt("Please provide a reason for rejection:")
                              if (reason) {
                                handleApproval(assignment.id, "rejected", reason)
                              }
                            }}
                            disabled={processingId === assignment.id}
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-white"
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
              ))}
            </div>

            {filteredAssignments.length === 0 && (
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                  <p className="text-gray-600">
                    {activeTab === "pending"
                      ? "No pending approvals at the moment."
                      : `No ${activeTab} assignments found.`}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
