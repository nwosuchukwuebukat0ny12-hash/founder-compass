import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, User, Mail, ShieldAlert, Users, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });




  const { data: teamProfiles, isLoading } = useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight font-heading">Lab Administration</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          Manage your personal account preferences and view the active staff directory for the Collective Lab.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 bg-muted/50 w-full sm:w-auto overflow-x-auto justify-start inline-flex">
          <TabsTrigger value="profile" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <User className="w-4 h-4 mr-2" /> My Profile
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" /> Team Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/10 border-b pb-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-background shadow-sm">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "L"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">{profile?.full_name || "Lab Administrator"}</CardTitle>
                  <CardDescription className="mt-1">Active Session</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{user?.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Role</Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Lab Staff (Admin)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                  System Preferences
                </h4>
                <p className="text-xs text-muted-foreground bg-muted p-4 rounded-lg border border-border/50">
                  You are currently using the VC-Grade High Contrast theme mandated by the Collective Lab design system. All internal tracking changes are persistently logged to the Institutional Memory cache.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="shadow-sm border">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Staff Directory</CardTitle>
              <CardDescription>All authenticated members with access to the Founder Pulse SRM.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {teamProfiles?.map((profile: any) => (
                    <div key={profile.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border border-primary/10">
                          <AvatarFallback className="bg-primary/5 text-primary text-sm font-semibold">
                            {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : profile.email?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{profile.full_name || profile.email}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(profile.created_at).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 capitalize">
                        {profile.role || "Staff"}
                      </Badge>
                    </div>
                  ))}
                  {(!teamProfiles || teamProfiles.length === 0) && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No team profiles found.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
