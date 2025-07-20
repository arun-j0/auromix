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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { createUser } from "@/lib/users";
import { getAgents, type User } from "@/lib/users";
import { notifyUserCreated } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function NewUserPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "admin" as "admin" | "agent" | "employee" | "",
    agentId: "",
    skills: [] as string[],
    isActive: true,
  });
  const [newSkill, setNewSkill] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const agentsData = await getAgents();
      setAgents(agentsData);
    } catch (error) {
      console.error("Error loading agents:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "admin",
      agentId: "",
      skills: [],
      isActive: true,
    });
    setNewSkill("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.role) {
        throw new Error("Please select a role");
      }

      const userData: any = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
      };

      // Only add optional fields if they have values
      if (formData.phone && formData.phone.trim() !== "") {
        userData.phone = formData.phone.trim();
      }

      if (formData.skills.length > 0) {
        userData.skills = formData.skills;
      }

      // Only add agentId for employees and if an agent is selected
      if (
        formData.role === "employee" &&
        formData.agentId &&
        formData.agentId !== ""
      ) {
        userData.agentId = formData.agentId;
      }

      const newUser = await createUser(userData);

      // Send welcome notification to the new user
      await notifyUserCreated(newUser.uid, {
        role: formData.role,
        name: formData.name,
      });

      router.back();

      toast({
        title: "User Created Successfully!",
        description: `${formData.name} has been added as a ${formData.role}.`,
      });

      resetForm();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New User</h1>
            <p className="text-gray-600">Create a new user account</p>
          </div>
        </div>

        <div className="max-w-2xl">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>
                Enter the details for the new user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter full name"
                      required
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="Enter email address"
                      required
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Enter password"
                      required
                      minLength={6}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Enter phone number"
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "admin" | "agent" | "employee") =>
                        setFormData({ ...formData, role: value, agentId: "" })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.role === "employee" && (
                    <div className="space-y-2">
                      <Label htmlFor="agent">Assign to Agent (Optional)</Label>
                      <Select
                        value={formData.agentId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, agentId: value })
                        }
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="none">No Agent</SelectItem>
                          {agents.map((agent) => (
                            <SelectItem key={agent.uid} value={agent.uid}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {(formData.role === "employee" ||
                  formData.role === "agent") && (
                  <div className="space-y-4">
                    <Label>Skills</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add a skill"
                        onKeyPress={(e) =>
                          e.key === "Enter" && (e.preventDefault(), addSkill())
                        }
                        className="bg-white"
                      />
                      <Button
                        type="button"
                        onClick={addSkill}
                        variant="outline"
                        className="bg-white"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Active User</Label>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create User
                  </Button>
                  <Link href="/admin/users">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white"
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
