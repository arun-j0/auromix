"use client";

import type React from "react";

import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Users, Copy, Check } from "lucide-react";
import { loginUser } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const demoCredentials = [
    {
      role: "Admin",
      email: "admin@auromix.com",
      password: "admin@auromix.com",
      description: "Full system access",
    },
    {
      role: "Agent",
      email: "agent@auromix.com",
      password: "agent@auromix.com",
      description: "Agent dashboard access",
    },
    {
      role: "Employee",
      email: "employee@auromix.com",
      password: "employee@auromix.com",
      description: "Employee dashboard access",
    },
    {
      role: "Employee of Agent",
      email: "employeeofagent@auromix.com",
      password: "employeeofagent@auromix.com",
      description: "Agent's employee access",
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { userData } = await loginUser(email, password);

      // Redirect based on role
      switch (userData.role) {
        case "admin":
          router.push("/admin/dashboard");
          break;
        case "agent":
          router.push("/agent/dashboard");
          break;
        case "employee":
          router.push("/employee/dashboard");
          break;
        default:
          setError("Invalid user role");
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const fillCredentials = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <CardTitle>Login to Auromix</CardTitle>
                <CardDescription>
                  Enter your credentials to continue
                </CardDescription>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Demo Credentials</DialogTitle>
                  <DialogDescription>
                    Use these credentials for testing different roles
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {demoCredentials.map((cred, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{cred.role}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            fillCredentials(cred.email, cred.password)
                          }
                        >
                          Use
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600">
                        {cred.description}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-medium">Email:</Label>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded flex-1">
                            {cred.email}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              copyToClipboard(cred.email, `email-${index}`)
                            }
                          >
                            {copiedField === `email-${index}` ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-medium">Pass:</Label>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded flex-1">
                            {cred.password}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              copyToClipboard(
                                cred.password,
                                `password-${index}`
                              )
                            }
                          >
                            {copiedField === `password-${index}` ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-blue-600 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
