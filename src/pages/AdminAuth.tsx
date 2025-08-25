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
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(true); // Default to signup mode
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is an admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (profile?.role === 'admin') {
          navigate('/admin-dashboard');
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    console.log('Admin auth attempt:', { isSignUp, email });

    try {
      if (isSignUp) {
        console.log('Attempting admin signup...');
        // Sign up with admin role
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin-dashboard`,
            data: {
              role: 'admin'
            }
          }
        });

        console.log('Signup result:', { data, authError });

        if (authError) throw authError;

        toast({
          title: "Success",
          description: "Admin account created! Please check your email to verify.",
        });
      } else {
        console.log('Attempting admin signin...');
        // Sign in
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        console.log('Signin result:', { data, authError });

        if (authError) throw authError;

        if (data.user) {
          console.log('User signed in, checking admin role...');
          // Check if user is an admin
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', data.user.id)
            .single();
          
          console.log('Profile check:', { profile, profileError });
          
          if (profile?.role === 'admin') {
            console.log('Admin role verified, navigating to dashboard...');
            navigate('/admin-dashboard');
          } else {
            throw new Error('Access denied. Admin privileges required.');
          }
        }
      }
    } catch (err: any) {
      console.error('Admin auth error:', err);
      setError(err.message);
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
                {isSignUp ? "Create your admin account" : "Manage the payment gateway platform"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-gateway-success border-gateway-success/30 w-fit mx-auto">
              {isSignUp ? "Create Admin Account" : "Admin Only"}
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
                      type="email"
                      placeholder="admin@test.com"
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
                  {isLoading ? "Processing..." : (isSignUp ? "Create Admin Account" : "Admin Sign In")}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setIsSignUp(!isSignUp)}
                  disabled={isLoading}
                >
                  {isSignUp ? "Already have an account? Sign In" : "Need to create admin account? Sign Up"}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="p-4 bg-muted/20 rounded-lg border border-gateway-success/20">
                <h4 className="text-sm font-medium mb-2 text-gateway-success">Demo Admin Credentials:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Email: admin@test.com</div>
                  <div>Password: Admin@123</div>
                  <div className="text-gateway-success mt-2">
                    {isSignUp ? "Use these credentials to create the admin account" : "Use these credentials to sign in"}
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