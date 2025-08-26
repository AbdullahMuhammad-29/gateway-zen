import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Settings, ArrowLeft, Mail, Lock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("Admin123");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if admin is already logged in via localStorage
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        if (session.role === 'admin' && session.expires > Date.now()) {
          navigate('/admin-dashboard');
        } else {
          localStorage.removeItem('admin_session');
        }
      } catch (err) {
        localStorage.removeItem('admin_session');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    console.log('Admin auth attempt:', { email });

    try {
      console.log('Attempting admin signin...');
      
      // Use custom admin verification function
      const { data, error: authError } = await supabase.rpc('verify_admin_credentials', {
        input_email: email,
        input_password: password
      });

      console.log('Signin result:', { data, authError });

      if (authError) throw authError;

      if ((data as any)?.success) {
        console.log('Admin credentials verified, creating session...');
        
        // Create admin session in localStorage
        const response = data as any;
        const adminSession = {
          user_id: response.user_id,
          email: response.email,
          role: response.role,
          expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        localStorage.setItem('admin_session', JSON.stringify(adminSession));
        
        toast({
          title: "Success",
          description: "Admin login successful!",
        });
        
        navigate('/admin-dashboard');
      } else {
        throw new Error((data as any)?.error || 'Invalid admin credentials');
      }
    } catch (err: any) {
      console.error('Admin auth error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card className="bg-gradient-card border-gateway-success/20 shadow-success">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-gateway-success/10 text-gateway-success">
                <Settings className="h-8 w-8" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">Admin Portal</CardTitle>
              <CardDescription className="text-base">
                Manage the payment gateway platform
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-gateway-success border-gateway-success/30 w-fit mx-auto">
              Admin Only
            </Badge>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-email"
                      type="text"
                      placeholder="admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  variant="admin" 
                  size="lg" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Admin Sign In"}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="p-4 bg-muted/20 rounded-lg border border-gateway-success/20">
                <h4 className="text-sm font-medium mb-2 text-gateway-success">Admin Credentials:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Email: admin</div>
                  <div>Password: Admin123</div>
                  <div className="text-gateway-success mt-2">
                    Use these credentials to sign in
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Footer */}
        <div className="flex items-center justify-center mt-8 space-x-2 text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span className="text-sm">Gateway Zen - Admin Portal</span>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;