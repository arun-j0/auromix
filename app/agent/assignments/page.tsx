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
import { ClipboardList, Search, Plus, Eye, Calendar, Clock } from "lucide-react"
import { getAssignmentsByAgent, type Assignment } from "@/lib/assignments"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default function AgentAssignmentsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.role !== "agent") {
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

  const loadAssignments = async (agentId: string) => {
    try {
      const assignmentsData = await getAssignmentsByAgent(agentId)
      setAssignments(assignmentsData)
      setFilteredAssignments(assignmentsData)
    } catch (error) {
      console.error("Error loading assignments:", error)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterAssignments(term, activeTab)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    filterAssignments(searchTerm, tab)
  }

  const filterAssignments = (searchTerm: string, status: string) => {
    let filtered = assignments

    // Filter by status
    if (status !== "all") {
      filtered = filtered.filter((assignment) => assignment.status === status)
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (assignment) =>
          assignment.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredAssignments(filtered)
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

  const assignmentCounts = {
    all: assignments.length,
    pending: assignments.filter((a) => a.status === "pending").length,
    approved: assignments.filter((a) => a.status === "approved").length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    completed: assignments.filter((a) => a.status === "completed").length,
    rejected: assignments.filter((a) => a.status === "rejected").length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={3} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
            <p className="text-gray-600">Track and manage your team's assignments</p>
          </div>
          <Link href="/agent/assignments/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Assignment
            </Button>
          </Link>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search assignments by product, employee, or order..."
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
            <TabsTrigger value="pending" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Pending ({assignmentCounts.pending})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Approved ({assignmentCounts.approved})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              In Progress ({assignmentCounts.in_progress})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Completed ({assignmentCounts.completed})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Rejected ({assignmentCounts.rejected})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
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
                            <Badge className={getStatusColor(assignment.status)}>
                              {assignment.status.replace("_", " ").toUpperCase()}
                            </Badge>
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
                              <p className="text-sm font-medium text-gray-600">Quantity</p>
                              <p className="text-sm text-gray-900">{assignment.quantity}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Deadline</p>
                              <p className="text-sm text-gray-900">{assignment.deadline.toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Specifications</p>
                            <p className="text-sm text-gray-700 line-clamp-2">{assignment.productSpecs}</p>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created: {assignment.createdAt.toLocaleDateString()}</span>
                            </div>
                            {assignment.approvedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Approved: {assignment.approvedAt.toLocaleDateString()}</span>
                              </div>
                            )}
                            {assignment.completedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Completed: {assignment.completedAt.toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm" className="bg-white">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
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
  )
}
