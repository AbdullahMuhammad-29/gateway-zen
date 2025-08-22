import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Shield, Zap, TrendingUp, Users, Settings, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-payment-gateway.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-8 w-8 text-primary-glow" />
            <span className="text-2xl font-bold text-foreground">Gateway Zen</span>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Zap className="h-4 w-4 mr-1" />
              Live Demo
            </Badge>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary-glow to-foreground bg-clip-text text-transparent">
            Payment Processing
            <br />
            <span className="text-accent">Reimagined</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Experience the future of payments with our sandbox payment gateway. 
            Secure, fast, and developer-friendly payment processing for modern businesses.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button variant="hero" size="xl" className="group">
              <CreditCard className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
              Try Demo Checkout
            </Button>
            <Button variant="outline" size="xl" className="backdrop-blur-sm">
              View Documentation
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gateway-success" />
              <span>Bank-Grade Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              <span>Lightning Fast</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>99.9% Uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Login Options */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-foreground">
              Choose Your Portal
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Access your dashboard and start processing payments or manage your platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Merchant Portal */}
            <Card className="relative overflow-hidden bg-gradient-card border-primary/20 hover:border-primary transition-all duration-300 group hover:shadow-gateway">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <CardHeader className="relative pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Users className="h-8 w-8" />
                  </div>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    For Businesses
                  </Badge>
                </div>
                <CardTitle className="text-2xl mb-2">Merchant Portal</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Access your payment dashboard, manage transactions, view analytics, and configure webhooks
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm text-muted-foreground">Payment processing & analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm text-muted-foreground">API key management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm text-muted-foreground">Webhook configuration</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm text-muted-foreground">Settlement management</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Link to="/merchant-auth" className="block">
                    <Button variant="merchant" size="lg" className="w-full">
                      <Users className="h-5 w-5 mr-2" />
                      Merchant Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Admin Portal */}
            <Card className="relative overflow-hidden bg-gradient-card border-gateway-success/20 hover:border-gateway-success transition-all duration-300 group hover:shadow-success">
              <div className="absolute inset-0 bg-gradient-to-br from-gateway-success/5 to-transparent" />
              <CardHeader className="relative pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gateway-success/10 text-gateway-success group-hover:bg-gateway-success/20 transition-colors">
                    <Settings className="h-8 w-8" />
                  </div>
                  <Badge variant="outline" className="text-gateway-success border-gateway-success/30">
                    Admin Only
                  </Badge>
                </div>
                <CardTitle className="text-2xl mb-2">Admin Portal</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Manage merchants, configure platform settings, monitor transactions, and oversee the entire system
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gateway-success"></div>
                    <span className="text-sm text-muted-foreground">Merchant management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gateway-success"></div>
                    <span className="text-sm text-muted-foreground">Platform configuration</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gateway-success"></div>
                    <span className="text-sm text-muted-foreground">Fraud monitoring</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gateway-success"></div>
                    <span className="text-sm text-muted-foreground">System analytics</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Link to="/admin-auth" className="block">
                    <Button variant="admin" size="lg" className="w-full">
                      <Settings className="h-5 w-5 mr-2" />
                      Admin Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-foreground">
              Built for Developers
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to integrate payments seamlessly
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                  <CreditCard className="h-6 w-6" />
                </div>
                <CardTitle>Sandbox Testing</CardTitle>
                <CardDescription>
                  Test with fake cards and bank accounts. Deterministic results for reliable testing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-card border-border/50 hover:border-gateway-success/30 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-xl bg-gateway-success/10 text-gateway-success w-fit mb-4">
                  <Shield className="h-6 w-6" />
                </div>
                <CardTitle>Secure by Design</CardTitle>
                <CardDescription>
                  Bank-grade security with encrypted keys, signed webhooks, and audit logs.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-card border-border/50 hover:border-accent/30 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit mb-4">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <CardTitle>Real-time Analytics</CardTitle>
                <CardDescription>
                  Track payments, monitor fraud, and analyze performance with detailed dashboards.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <CreditCard className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Gateway Zen</span>
          </div>
          <p className="text-muted-foreground">
            A production-quality payment gateway sandbox for testing and development
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
