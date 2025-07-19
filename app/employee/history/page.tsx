"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { ClipboardList, Search, Calendar, Clock, CheckCircle } from "lucide-react"
import { getAssignmentsByEmployee, type Assignment } from "@/lib/assignments"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EmployeeHistoryPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("completed") // Default to completed tasks
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
    if (status === "completed") {
      filtered = filtered.filter((assignment) => assignment.status === "completed")
    } else if (status === "all") {
      // For history, "all" might mean all completed, or all tasks ever.
      // Sticking to completed for "history" context.
      filtered = filtered.filter((assignment) => assignment.status === "completed")
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

  const getStatusColor = (status: string) => {
    switch (status) {
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
          <p className="mt-4 text-gray-600">Loading history...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const historyCounts = {
    completed: assignments.filter((a) => a.status === "completed").length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={2} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Task History</h1>
            <p className="text-gray-600">Review your completed tasks</p>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search completed tasks by product, order, or specifications..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-1 bg-white md:grid-cols-2">
            <TabsTrigger value="completed" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Completed ({historyCounts.completed})
            </TabsTrigger>
            {/* Add other tabs if needed for different history views, e.g., "all" */}
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
                              <p className="text-sm text-gray-900">{assignment.deadline.toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Specifications</p>
                            <p className="text-sm text-gray-700">{assignment.productSpecs}</p>
                          </div>

                          {assignment.notes && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-600 mb-1">Completion Notes</p>
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
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No completed tasks found</h3>
                    <p className="text-gray-600">
                      {searchTerm ? "No tasks match your search criteria." : "You haven't completed any tasks yet."}
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
